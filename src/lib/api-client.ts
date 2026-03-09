import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// We can add interceptors here later if we need to handle global errors (e.g., redirecting on 401s)
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        // Standardize error format to always throw a descriptive message.
        const message = error.response?.data?.error || error.message || 'An unexpected error occurred';
        return Promise.reject(new Error(message));
    }
);
