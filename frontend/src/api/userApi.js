import api from './setup';

export const loginApi = async ({ email, password, role, rememberMe }) => {
    const { data } = await api.post('/user/login', {
        email,
        password,
        role: (role || 'USER').toUpperCase(),
        rememberMe: Boolean(rememberMe),
    });
    return data;
};

export const registerApi = async ({ email, password, name, role, rememberMe }) => {
    const { data } = await api.post('/user/register', {
        email,
        password,
        name,
        role: (role || 'USER').toUpperCase(),
        rememberMe: Boolean(rememberMe),
    });
    return data;
};

export const meApi = async () => {
    const { data } = await api.get('/user/me');
    return data;
};

export const logoutApi = async () => {
    const { data } = await api.post('/user/logout');
    return data;
};

export function getGoogleOAuthUrl({ role = 'USER', rememberMe = false } = {}) {
    const base =
        import.meta.env.VITE_BASE_URL ||
        import.meta.env.VITE_API_URL ||
        'http://localhost:8080';
    const params = new URLSearchParams({
        role: String(role).toUpperCase(),
        rememberMe: String(Boolean(rememberMe)),
    });
    return `${base}/user/oauth/google?${params.toString()}`;
}

export function consumeAuthRedirect() {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const authError = params.get('authError');

    if (tokenFromUrl || authError) {
        params.delete('token');
        params.delete('authError');
        const qs = params.toString();
        const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', next);
    }

    return { token: tokenFromUrl, authError };
}
