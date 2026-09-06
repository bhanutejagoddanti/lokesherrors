import api from './setup';

export const fetchHealthApi = async () => {
    const start = performance.now();
    const { data, headers } = await api.get('/health');
    const latency = Math.round(performance.now() - start);
    return {
        ...data,
        latency,
        servedBy: headers['x-served-by'] || data.pod || 'Kubernetes Pod',
    };
};

export const fetchSystemMetricsApi = async () => {
    const start = performance.now();
    const { data, headers } = await api.get('/system/metrics');
    const latency = Math.round(performance.now() - start);
    return {
        ...data,
        latency,
        servedBy: headers['x-served-by'] || data.pod || 'Kubernetes Pod',
    };
};
