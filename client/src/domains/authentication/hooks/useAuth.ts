/**
 * Authentication React Query Hooks
 *
 * Clean data fetching hooks that replace manual async state management.
 * Provides proper loading states, error handling, and caching.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';

import { authService } from '../services/AuthenticationService';
import { isPasswordChangeRequired } from '../types/api';

import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
} from '../services/AuthenticationService';
import type { LoginResponse } from '../types/api';

/**
 * Query hook for session verification
 */
export function useAuthVerification() {
  return useQuery({
    queryKey: queryKeys.auth.verify(),
    queryFn: () => authService.verifySession(),
    retry: false, // Don't retry auth verification
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    meta: {
      errorMessage: 'Failed to verify session',
    },
  });
}

/**
 * Query hook for first-time setup check
 */
export function useFirstTimeCheck() {
  return useQuery({
    queryKey: queryKeys.auth.firstTime(),
    queryFn: () => authService.checkFirstTime(),
    staleTime: Infinity, // This won't change once false
    meta: {
      errorMessage: 'Failed to check first-time setup',
    },
  });
}

/**
 * Mutation hook for user registration
 */
export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RegisterRequest) => authService.register(request),
    onSuccess: (data: AuthResponse) => {
      // Update auth verification cache with new user data
      queryClient.setQueryData(queryKeys.auth.verify(), data);

      // Mark first-time as false since user is now registered
      queryClient.setQueryData(queryKeys.auth.firstTime(), false);
    },
    meta: {
      errorMessage: 'Registration failed',
    },
  });
}

/**
 * Mutation hook for user login
 *
 * Returns either AuthResponse (normal login) or PasswordChangeRequiredResponse
 * (when user needs to change password after admin reset).
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (request: LoginRequest) => authService.login(request),
    onSuccess: (data: LoginResponse) => {
      // Only update cache if this is a normal login (not password change required)
      if (!isPasswordChangeRequired(data)) {
        queryClient.setQueryData(queryKeys.auth.verify(), data);
      }
    },
    meta: {
      errorMessage: 'Login failed',
    },
  });
}

/**
 * Mutation hook for logout
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear all auth-related cache
      queryClient.removeQueries({ queryKey: ['auth'] });
      queryClient.removeQueries({ queryKey: ['tubes'] });
      queryClient.removeQueries({ queryKey: ['researchers'] });

      // Reset UI state stores (clear selections, navigation state)
      useTubeStore.getState().resetStore();
    },
    meta: {
      errorMessage: 'Logout failed',
    },
  });
}

/**
 * Derived state hooks for UI components
 */
export function useAuthState() {
  const { data: authData, isLoading: isVerifying, error: authError } = useAuthVerification();
  const { data: isFirstTime, isLoading: isCheckingFirstTime } = useFirstTimeCheck();

  return {
    // Authentication state
    isAuthenticated: !!authData && !authError,
    user: authData?.user ?? null,
    permissions: authData?.user?.role === 'admin' ? ['admin'] : ['user'],

    // Loading states
    isLoading: isVerifying || isCheckingFirstTime,
    isVerifying,
    isCheckingFirstTime,

    // First-time setup
    isFirstTime: isFirstTime ?? false,

    // Error state
    error: authError,
  };
}

/**
 * Hook for auth actions (mutations)
 */
export function useAuthActions() {
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  return {
    // Mutation functions
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,

    // Async versions
    registerAsync: registerMutation.mutateAsync,
    loginAsync: loginMutation.mutateAsync,
    logoutAsync: logoutMutation.mutateAsync,

    // Loading states
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,

    // Error states
    registerError: registerMutation.error,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,

    // Reset functions
    resetRegisterError: registerMutation.reset,
    resetLoginError: loginMutation.reset,
    resetLogoutError: logoutMutation.reset,
  };
}
