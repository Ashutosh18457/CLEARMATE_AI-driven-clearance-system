import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ─── Request Interceptor: Attach JWT ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('clearmate_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Unwrap envelope & handle 401 ───
api.interceptors.response.use(
  (response) => {
    // API returns { success: true, message, data }
    // Return the full response so callers can access response.data.data, response.data.message, etc.
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Something went wrong';

    // 401 Unauthorized — token expired or invalid
    if (status === 401) {
      localStorage.removeItem('clearmate_token');
      localStorage.removeItem('clearmate_user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Enrich the error object with our API message
    const enrichedError = new Error(message);
    enrichedError.status = status;
    enrichedError.code = error.response?.data?.error?.code;
    enrichedError.originalError = error;

    return Promise.reject(enrichedError);
  }
);

export default api;
