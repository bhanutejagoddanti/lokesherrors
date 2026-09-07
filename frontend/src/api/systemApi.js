import api from './setup';

export const fetchHealthApi = async () => {
    const start = performance.now();
    const { data, headers } = await api.get('/health');
    const latency = Math.round(performance.now() - start);
    return {
        ...data,
        latency,
        servedBy: headers['x-pod-id'] || headers['x-served-by'] || data.pod || 'Kubernetes Pod',
    };
};

export const fetchSystemMetricsApi = async () => {
    const start = performance.now();
    const { data, headers } = await api.get('/system/metrics');
    const latency = Math.round(performance.now() - start);
    return {
        ...data,
        latency,
        servedBy: headers['x-pod-id'] || headers['x-served-by'] || data.pod || 'Kubernetes Pod',
    };
};

export const fetchSystemQueueApi = async () => {
    const { data } = await api.get('/system/queue');
    return data;
};

/**
 * Fetch this pod's real-time snapshot.
 * Because the Kubernetes service load-balances each request to a different pod,
 * calling this multiple times in parallel gives you data from N different pods.
 * We call it N times with a small delay to discover the pod population.
 */
export const fetchPodSnapshotApi = async () => {
    const start = performance.now();
    const { data, headers } = await api.get('/system/pods');
    const latency = Math.round(performance.now() - start);
    return {
        ...data,
        latency,
        // Kubernetes routes each request to a (potentially different) pod
        servedByPod: headers['x-pod-id'] || data.podId || 'unknown-pod',
    };
};

/**
 * Discover all live pods by firing N parallel requests to /system/pods.
 * The Kubernetes LoadBalancer routes them to different pods, so we collect
 * unique pod IDs and their real metrics.
 *
 * @param {number} probes - how many parallel requests to send
 */
export const discoverPodsApi = async (probes = 8) => {
    const requests = Array.from({ length: probes }, () =>
        fetchPodSnapshotApi().catch(() => null)
    );
    const results = await Promise.all(requests);
    const seen = new Map(); // podId -> snapshot
    for (const r of results) {
        if (r && r.podId && !seen.has(r.podId)) {
            seen.set(r.podId, r);
        }
    }
    return [...seen.values()];
};
