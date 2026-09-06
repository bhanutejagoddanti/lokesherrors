import axios from 'axios';
import { clearStoredToken, getStoredToken } from './authStorage';

const baseURL =
    import.meta.env.VITE_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8080';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearStoredToken();
        }
        return Promise.reject(error);
    },
);

export default api;
