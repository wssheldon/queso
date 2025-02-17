import axios, { AxiosError } from 'axios';
import { env } from '../config/env';

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface GoogleCodeExchangeRequest {
  code: string;
  state: string;
}

// Create an axios instance with the base URL from environment
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API functions
export const auth = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    localStorage.setItem('auth_token', response.data.token);
    return response.data;
  },

  signup: async (data: SignupRequest): Promise<User> => {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('auth_token');
    await apiClient.post('/auth/logout');
  },

  getUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  googleLogin: async (): Promise<{ url: string }> => {
    const response = await apiClient.get<{ url: string }>('/auth/google/login');
    return response.data;
  },

  exchangeGoogleCode: async (data: GoogleCodeExchangeRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/google/callback', data);
    localStorage.setItem('auth_token', response.data.token);
    return response.data;
  },
};

// Error handling helper
export const isAxiosError = (error: unknown): error is AxiosError => {
  return axios.isAxiosError(error);
};

// Example API function
export const fetchUsers = async () => {
  const response = await apiClient.get('/users');
  return response.data;
};
