import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import userRoutes from './routes/userApis.js';
import eventRoutes from './routes/eventApis.js';
import { surgeQueueMiddleware, surgeQueue } from './middleware/surgeQueue.js';
import { podTelemetryMiddleware, getPodSnapshot } from './middleware/podTelemetry.js';

const app = express();

// ------------------------------------------------------------------
// Configuration — driven by environment variables (12-factor app)
// ------------------------------------------------------------------
const PORT       = parseInt(process.env.PORT || '4001', 10);
const POD_ID     = process.env.HOSTNAME || `local-${Math.random().toString(36).slice(2, 8)}`;
const SERVICE    = process.env.SERVICE_NAME || 'workday-backend-service';
const FRONTEND   = process.env.FRONTEND_URL || 'http://localhost:5173';

// ------------------------------------------------------------------
// Core middleware stack
// ------------------------------------------------------------------
app.use(cors({ origin: FRONTEND, credentials: true }));
app.use(morgan('combined'));     // structured HTTP access logs (Apache format)
app.use(cookieParser());
app.use(express.json());

// Real-time per-pod telemetry (records actual request counts, latency, RPS)
app.use(podTelemetryMiddleware);

// Queue-Based FIFO Load Balancer (concurrency cap + surge buffer)
// Bypasses: /health, /system/* — these must always respond instantly
app.use(surgeQueueMiddleware);

// ------------------------------------------------------------------
// Application routes
// ------------------------------------------------------------------
app.use('/user', userRoutes);
app.use('/events', eventRoutes);

// ------------------------------------------------------------------
// Kubernetes Readiness & Liveness Probe
// Called by kubelet every 2s — MUST respond in < 1s to keep pod Ready
// ------------------------------------------------------------------
app.get('/health', (_req, res) => {
    res.setHeader('X-Pod-Id', POD_ID);
    res.status(200).json({
        status: 'UP',
        pod: POD_ID,
        service: SERVICE,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

// ------------------------------------------------------------------
// Live Per-Pod Snapshot
// Returns 100% real runtime metrics — no hardcoded values.
// Each pod in the cluster responds with its own independent snapshot.
// The frontend aggregates N responses (one per pod) to build the
// "Running Containers" table dynamically.
// ------------------------------------------------------------------
app.get('/system/pods', (_req, res) => {
    res.setHeader('X-Pod-Id', POD_ID);
    res.status(200).json(getPodSnapshot());
});

// ------------------------------------------------------------------
// SurgeQueue live telemetry
// Returns real-time queue depth, concurrency, wait times.
// Each pod has its own queue instance — reflects this pod's queue state.
// ------------------------------------------------------------------
app.get('/system/queue', (_req, res) => {
    res.setHeader('X-Pod-Id', POD_ID);
    res.status(200).json(surgeQueue.getStats());
});

// ------------------------------------------------------------------
// Cluster-level system metrics (this pod's view of the cluster config)
// ------------------------------------------------------------------
app.get('/system/metrics', (_req, res) => {
    res.setHeader('X-Pod-Id', POD_ID);
    const mem = process.memoryUsage();
    res.status(200).json({
        status: 'healthy',
        pod: POD_ID,
        service: SERVICE,
        loadBalancer: {
            type: 'Kubernetes Service (LoadBalancer)',
            ports: [8080, 4001],
            targetPort: PORT,
            algorithm: 'Queue-Based FIFO Load Balancer (SurgeQueue)',
            queueStats: surgeQueue.getStats(),
        },
        autoscaling: {
            controller: 'HorizontalPodAutoscaler (HPA v2)',
            minReplicas: parseInt(process.env.HPA_MIN || '2', 10),
            maxReplicas: parseInt(process.env.HPA_MAX || '10', 10),
            targetCpuUtilization: `${process.env.HPA_CPU_TARGET || '50'}%`,
            targetMemoryUtilization: `${process.env.HPA_MEM_TARGET || '75'}%`,
            scaleUpPolicy: '0s stabilization, +2 pods per 15s',
            scaleDownPolicy: '60s stabilization, -50% per 60s',
        },
        resilience: {
            concurrencyControl: 'Atomic SQL Conditional Decrement',
            duplicatePrevention: 'Compound Unique Constraint (userId, eventId)',
            overbookingGuard: 'Strict non-negative check',
            loadShedding: 'FIFO Queue (max 3000 buffered)',
        },
        memory: {
            heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
            rssMb: Math.round(mem.rss / 1024 / 1024),
        },
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

// ------------------------------------------------------------------
// Cooperative CPU stress endpoint for HPA autoscale testing
// Uses setImmediate yields so the event loop never fully blocks —
// new TCP connections can always be accepted during the stress run.
// ------------------------------------------------------------------
app.get('/system/stress', async (req, res) => {
    res.setHeader('X-Pod-Id', POD_ID);
    // Cap at 200ms to prevent runaway worker starvation
    const targetMs = Math.min(Number(req.query.ms) || 35, 200);
    const start = Date.now();

    // Cooperative compute: 8ms slices separated by setImmediate yields
    while (Date.now() - start < targetMs) {
        const sliceEnd = Math.min(Date.now() + 8, start + targetMs);
        while (Date.now() < sliceEnd) {
            Math.sqrt(Math.random() * 1e6);
        }
        await new Promise((resolve) => setImmediate(resolve));
    }

    res.status(200).json({
        status: 'stress-handled',
        pod: POD_ID,
        computeDurationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
    });
});

// ------------------------------------------------------------------
// HTTP Server — tuned for high-concurrency Keep-Alive connections
// ------------------------------------------------------------------
const server = app.listen(PORT, () => {
    console.log(`[${POD_ID}] Server running on port ${PORT}`);
    console.log(`[${POD_ID}] SurgeQueue concurrency cap: ${surgeQueue.maxConcurrency}`);
});

// These two settings prevent Kubernetes LoadBalancer from hitting idle-timeout
// on keep-alive connections before Node's own timeout fires (must be LB timeout + 5s).
server.keepAliveTimeout    = 65_000; // 65s (LB timeout is typically 60s)
server.headersTimeout      = 66_000; // must be > keepAliveTimeout
server.maxRequestsPerSocket = 0;      // unlimited reuse per TCP connection

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[${POD_ID}] Port ${PORT} already in use — likely another process.`);
    } else {
        console.error(`[${POD_ID}] Server error:`, err);
    }
    process.exit(1);
});

// Graceful shutdown — Kubernetes sends SIGTERM before killing the pod
process.on('SIGTERM', () => {
    console.log(`[${POD_ID}] SIGTERM received — draining connections…`);
    server.close(() => {
        console.log(`[${POD_ID}] Server closed. Exiting.`);
        process.exit(0);
    });
    // Force-kill if drain takes > 10s
    setTimeout(() => process.exit(0), 10_000);
});
