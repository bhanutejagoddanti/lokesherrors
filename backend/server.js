import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import userRoutes from './routes/userApis.js';
import eventRoutes from './routes/eventApis.js';

const app = express();
const PORT = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
    origin: frontendOrigin,
    credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

app.use('/user', userRoutes);
app.use('/events', eventRoutes);

// Kubernetes Health & Liveness / Readiness endpoint
app.get('/health', (req, res) => {
    res.setHeader('X-Served-By', process.env.HOSTNAME || 'local-instance');
    res.status(200).json({
        status: 'UP',
        pod: process.env.HOSTNAME || 'local-instance',
        service: 'workday-backend-service',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
    });
});

// System & Kubernetes Telemetry endpoint for frontend
app.get('/system/metrics', (req, res) => {
    res.setHeader('X-Served-By', process.env.HOSTNAME || 'local-instance');
    const memoryUsage = process.memoryUsage();
    res.status(200).json({
        status: 'healthy',
        pod: process.env.HOSTNAME || 'local-instance',
        service: 'workday-backend-service',
        loadBalancer: {
            ports: [8080, 4001],
            targetPort: 4001,
            algorithm: 'Round-Robin / IP-Hash',
        },
        autoscaling: {
            controller: 'HorizontalPodAutoscaler (HPA v2)',
            minReplicas: 2,
            maxReplicas: 10,
            targetCpuUtilization: '50%',
            targetMemoryUtilization: '75%',
            scaleUpWindow: '0s (Immediate)',
            scaleDownWindow: '60s (Stabilized)',
        },
        resilience: {
            concurrencyControl: 'Atomic SQL Conditional Decrement',
            duplicatePrevention: 'Compound Unique Constraint (userId, eventId)',
            overbookingGuard: 'Strict non-negative check (gt 0)',
        },
        memory: {
            rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

// Stress endpoint for load testing HPA autoscaling
app.get('/system/stress', (req, res) => {
    res.setHeader('X-Served-By', process.env.HOSTNAME || 'local-instance');
    const duration = Math.min(Number(req.query.ms) || 50, 250);
    const end = Date.now() + duration;
    // Execute a tight CPU mathematical loop to generate measurable CPU utilization for metrics-server
    while (Date.now() < end) {
        Math.sqrt(Math.random() * 100000);
    }
    res.status(200).json({
        status: 'stress-handled',
        pod: process.env.HOSTNAME || 'local-instance',
        computeDurationMs: duration,
        timestamp: new Date().toISOString(),
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use (EADDRINUSE). Another process (e.g. Kubernetes LoadBalancer) is already listening on this port.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
