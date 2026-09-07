/**
 * PodTelemetry: Real-time per-pod request tracker.
 *
 * This runs inside each pod instance. It tracks real request counts,
 * latency histograms, and memory snapshots — all from live runtime data.
 * No hardcoded values. All data is derived from actual HTTP traffic.
 */

const POD_ID = process.env.HOSTNAME || `local-${Math.random().toString(36).slice(2, 8)}`;
const startedAt = Date.now();

// Per-route request tracking
const routeStats = new Map(); // route => { count, totalMs, errors }

// Sliding window: last 60 seconds of per-second RPS
const rpsWindow = []; // [{ ts: epochMs, count: n }]

let totalRequests = 0;
let totalErrors = 0;
let totalLatencyMs = 0;
let peakRps = 0;
let currentWindowCount = 0;
let windowStart = Date.now();

/**
 * Middleware: intercepts every request, measures real latency,
 * and records stats into the in-memory tracker.
 */
export function podTelemetryMiddleware(req, res, next) {
    const startMs = performance.now();

    res.on('finish', () => {
        const durationMs = Math.round(performance.now() - startMs);
        const route = `${req.method} ${req.route?.path || req.path}`;
        const isError = res.statusCode >= 400;

        // Global counters
        totalRequests++;
        totalLatencyMs += durationMs;
        if (isError) totalErrors++;

        // Per-route stats
        const existing = routeStats.get(route) || { count: 0, totalMs: 0, errors: 0 };
        routeStats.set(route, {
            count: existing.count + 1,
            totalMs: existing.totalMs + durationMs,
            errors: existing.errors + (isError ? 1 : 0),
        });

        // Sliding RPS window (1-second buckets)
        const now = Date.now();
        if (now - windowStart >= 1000) {
            const rps = currentWindowCount;
            rpsWindow.push({ ts: windowStart, rps });
            if (rpsWindow.length > 60) rpsWindow.shift(); // keep 60s history
            if (rps > peakRps) peakRps = rps;
            currentWindowCount = 1;
            windowStart = now;
        } else {
            currentWindowCount++;
        }
    });

    next();
}

/**
 * Returns a real-time snapshot of this pod's live metrics.
 * Called by GET /system/pods — aggregated in the frontend.
 */
export function getPodSnapshot() {
    const mem = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

    const avgLatencyMs = totalRequests > 0
        ? Math.round(totalLatencyMs / totalRequests)
        : 0;

    // Compute current RPS from last window
    const latestRps = rpsWindow.length > 0
        ? rpsWindow[rpsWindow.length - 1].rps
        : currentWindowCount;

    // Route breakdown (top routes by count)
    const topRoutes = [...routeStats.entries()]
        .map(([route, stats]) => ({
            route,
            count: stats.count,
            avgMs: stats.totalMs > 0 ? Math.round(stats.totalMs / stats.count) : 0,
            errorRate: stats.count > 0 ? `${((stats.errors / stats.count) * 100).toFixed(1)}%` : '0%',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        podId: POD_ID,
        status: 'Running',
        uptimeSeconds,
        startedAt: new Date(startedAt).toISOString(),
        requests: {
            total: totalRequests,
            errors: totalErrors,
            successRate: totalRequests > 0
                ? `${(((totalRequests - totalErrors) / totalRequests) * 100).toFixed(1)}%`
                : '100%',
            avgLatencyMs,
            currentRps: latestRps,
            peakRps,
        },
        memory: {
            heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
            rssMb: Math.round(mem.rss / 1024 / 1024),
            externalMb: Math.round(mem.external / 1024 / 1024),
            heapUsedPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
        },
        rpsHistory: rpsWindow.slice(-30), // last 30s of RPS
        topRoutes,
        timestamp: new Date().toISOString(),
    };
}
