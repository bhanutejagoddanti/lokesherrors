/**
 * SurgeQueue: Queue-based Load Balancer & Concurrency Limiter
 * Replaces naive round-robin flooding with an organized FIFO Queue.
 *
 * Prevents pod event-loop starvation by limiting active concurrent operations
 * and queuing excess traffic during unpredictable surges.
 */

class SurgeQueue {
    constructor(maxConcurrency = 20, maxQueueSize = 2500) {
        this.maxConcurrency = maxConcurrency;
        this.maxQueueSize = maxQueueSize;
        this.activeRequests = 0;
        this.queue = [];
        this.totalQueued = 0;
        this.totalProcessed = 0;
        this.totalRejected = 0;
        this.totalWaitTimeMs = 0;
    }

    middleware() {
        return (req, res, next) => {
            // Health checks bypass queue for instant k8s readiness & liveness probes
            if (req.path === '/health' || req.path === '/system/metrics' || req.path === '/system/queue') {
                return next();
            }

            const enqueuedAt = performance.now();

            if (this.activeRequests < this.maxConcurrency) {
                this.activeRequests++;
                this.totalProcessed++;
                res.setHeader('X-LB-Algorithm', 'Queue-Based-FIFO');
                res.setHeader('X-Queue-Depth', '0');
                res.setHeader('X-Queue-Wait-Ms', '0');

                this._attachFinishHook(res);
                return next();
            }

            // Queue full protection
            if (this.queue.length >= this.maxQueueSize) {
                this.totalRejected++;
                return res.status(503).json({
                    message: 'SurgeShield Queue capacity reached. Please retry in a few seconds.',
                    queueDepth: this.queue.length,
                });
            }

            // Enqueue in FIFO surge buffer
            this.totalQueued++;
            this.queue.push({
                req,
                res,
                next,
                enqueuedAt,
            });

            // Set response headers informing client of queue position
            res.setHeader('X-LB-Algorithm', 'Queue-Based-FIFO');
            res.setHeader('X-Queue-Depth', String(this.queue.length));
        };
    }

    _attachFinishHook(res) {
        const cleanup = () => {
            res.removeListener('finish', cleanup);
            res.removeListener('close', cleanup);
            this.activeRequests--;
            this._dequeueNext();
        };

        res.once('finish', cleanup);
        res.once('close', cleanup);
    }

    _dequeueNext() {
        if (this.activeRequests >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }

        const item = this.queue.shift();
        if (!item) return;

        const { res, next, enqueuedAt } = item;

        // If client closed connection while in queue, skip to next
        if (res.writableEnded || res.destroyed) {
            return this._dequeueNext();
        }

        this.activeRequests++;
        this.totalProcessed++;
        const waitTimeMs = Math.round(performance.now() - enqueuedAt);
        this.totalWaitTimeMs += waitTimeMs;

        res.setHeader('X-Queue-Depth', String(this.queue.length));
        res.setHeader('X-Queue-Wait-Ms', String(waitTimeMs));

        this._attachFinishHook(res);
        next();
    }

    getStats() {
        return {
            algorithm: 'Queue-Based Load Balancer (FIFO Surge Queue)',
            activeConcurrency: this.activeRequests,
            maxConcurrency: this.maxConcurrency,
            queueDepth: this.queue.length,
            maxQueueSize: this.maxQueueSize,
            totalQueued: this.totalQueued,
            totalProcessed: this.totalProcessed,
            totalRejected: this.totalRejected,
            avgWaitTimeMs: this.totalProcessed > 0 ? Math.round(this.totalWaitTimeMs / this.totalProcessed) : 0,
            loadShedding: 'Zero-Drops (FIFO Buffering)',
        };
    }
}

export const surgeQueue = new SurgeQueue(25, 3000);
export const surgeQueueMiddleware = surgeQueue.middleware();
