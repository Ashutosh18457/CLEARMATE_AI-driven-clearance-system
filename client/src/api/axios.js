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
    const token = sessionStorage.getItem('clearmate_token') || localStorage.getItem('clearmate_token');
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
    return response;
  },
  (error) => {
    const status = error.response?.status;
    let message = error.response?.data?.message;

    // 401 Unauthorized — token expired or invalid
    if (status === 401) {
      sessionStorage.removeItem('clearmate_token');
      sessionStorage.removeItem('clearmate_user');
      localStorage.removeItem('clearmate_token');
      localStorage.removeItem('clearmate_user');
      localStorage.removeItem('token');
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

    const customError = new Error(message);
    customError.status = status;
    customError.response = error.response;
    return Promise.reject(customError);
  }
);

export default api;
