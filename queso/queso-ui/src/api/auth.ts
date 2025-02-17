import { useMutation, useQuery } from '@tanstack/react-query';
import { auth, type LoginRequest, type SignupRequest, type User, type AuthResponse } from './client';

// Query keys
export const authKeys = {
    all: ['auth'] as const,
    user: () => [...authKeys.all, 'user'] as const,
    login: () => [...authKeys.all, 'login'] as const,
    signup: () => [...authKeys.all, 'signup'] as const,
    logout: () => [...authKeys.all, 'logout'] as const,
} as const;

// Hooks
export const useLogin = () => {
    return useMutation<AuthResponse, Error, LoginRequest>({
        mutationKey: authKeys.login(),
        mutationFn: auth.login,
    });
};

export const useSignup = () => {
    return useMutation<User, Error, SignupRequest>({
        mutationKey: authKeys.signup(),
        mutationFn: auth.signup,
    });
};

export const useUser = () => {
    return useQuery<User, Error>({
        queryKey: authKeys.user(),
        queryFn: auth.getUser,
        retry: false,
        // Only try to get user if we have a token
        enabled: !!localStorage.getItem('auth_token'),
    });
};

export const useLogout = () => {
    return useMutation<void, Error, void>({
        mutationKey: authKeys.logout(),
        mutationFn: auth.logout,
    });
}; 