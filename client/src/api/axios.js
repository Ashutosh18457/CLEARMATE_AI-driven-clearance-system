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
    let message = error.response?.data?.message;

    // 401 Unauthorized — token expired or invalid
    if (status === 401) {
      localStorage.removeItem('clearmate_token');
      localStorage.removeItem('clearmate_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const rawData = error.response?.data;
    if (typeof rawData === 'string' && (rawData.includes('ECONNREFUSED') || rawData.includes('500 Internal Server Error'))) {
      message = 'Backend server is offline on port 5000. Please start the backend server ("npm start" inside server/).';
    }

    if (!message) {
      if (status === 429) {
        message = 'Too many requests. Please wait a moment before trying again.';
      } else if (status === 500) {
        message = 'Backend server is offline or encountered an unexpected error. Please ensure backend server is running.';
      } else if (status === 404) {
        message = 'Requested API resource was not found.';
      } else if (!status) {
        message = 'Network error: Cannot reach the backend server. Please ensure the backend is running.';
      } else {
        message = error.message || 'Something went wrong';
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
