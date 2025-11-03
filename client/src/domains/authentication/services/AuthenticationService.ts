/**
 * Authentication Application Service
 * 
 * Clean separation of concerns - removes business logic from UI components.
 * Coordinates between domain, infrastructure, and UI layers.
 */
import { httpClient } from '@infra/api/httpClient';
import {
  ApiError,
  type RegisterWithResearcherRequest,
  type VerifyEmailRequest,
  type VerificationStatusResponse
} from '@odysseus/shared-schemas';
import { queryClient } from '@app/queryClient';
import { queryKeys } from '@app/queryKeys';

// Domain types (keep existing types intact)
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastActivity: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface AuthResponse {
  user: User;
  tokens: any; // TokenPair from session types
}

export interface RegisterWithResearcherResponse {
  user: User;
  tokens?: any; // Optional - only for approved users
  status: 'approved' | 'pending';
  message: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PasswordRequirements {
  passwordMinLength: number;
  requireStrongPasswords: boolean;
  passwordRequireSpecialChars: boolean;
}

/**
 * Authentication service with clean business logic
 */
export class AuthService {
  /**
   * Register new user (first-time setup - legacy method)
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await httpClient.post<{ success: boolean; data: any }>('/public/auth/register', request);

      if (response.data.success && response.data.data) {
        const responseData = response.data.data;

        // Return enhanced response with token pair
        return {
          user: responseData.user,
          tokens: responseData.tokens
        };
      }

      throw new Error('Registration failed');
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Registration failed');
    }
  }

  /**
   * Register user with researcher profile and approval workflow
   *
   * First user: Auto-approved as admin (returns tokens)
   * Subsequent users: Pending approval (no tokens)
   */
  async registerWithResearcher(request: RegisterWithResearcherRequest): Promise<RegisterWithResearcherResponse> {
    try {
      const response = await httpClient.post<{ success: boolean; data: any }>('/public/auth/register-with-researcher', request);

      if (response.data.success && response.data.data) {
        const responseData = response.data.data;

        // Return response with optional tokens (based on approval status)
        return {
          user: responseData.user,
          tokens: responseData.tokens, // undefined for pending users
          status: responseData.status,
          message: responseData.message
        };
      }

      throw new Error('Registration failed');
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Registration failed');
    }
  }

  /**
   * Login with username and password
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      // HttpClient automatically transforms dates using existing responseTransformers
      const response = await httpClient.post<{ success: boolean; data: any }>('/public/auth/login', request);
      
      if (response.data.success && response.data.data) {
        const responseData = response.data.data;
        
        // Return transformed response (dates automatically converted by HttpClient)
        return {
          user: responseData.user,
          tokens: responseData.tokens
        };
      }
      
      throw new Error('Login failed');
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Login failed');
    }
  }

  /**
   * Verify current session
   */
  async verifySession(): Promise<AuthResponse> {
    try {
      const response = await httpClient.get<{ success: boolean; data: { user: User } }>('/auth/verify');
      
      if (response.data.success && response.data.data) {
        return {
          user: response.data.data.user,
          tokens: null // No tokens needed for verify - just user info
        };
      }
      
      throw new Error('Session verification failed');
    } catch (error) {
      // SessionManager will handle token cleanup
      throw error;
    }
  }

  /**
   * Check if this is first-time setup
   */
  async checkFirstTime(): Promise<boolean> {
    try {
      const response = await httpClient.get<{ success: boolean; data: { isFirstTime: boolean } }>('/public/auth/first-time');

      if (response.data.success && response.data.data) {
        return response.data.data.isFirstTime;
      }

      return false;
    } catch (error) {
      console.error('Failed to check first-time setup:', error);
      return false;
    }
  }

  /**
   * Get password requirements (for registration form validation)
   */
  async getPasswordRequirements(): Promise<PasswordRequirements> {
    try {
      const response = await httpClient.get<{ success: boolean; data: PasswordRequirements }>('/public/auth/password-requirements');

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      // Default fallback requirements
      return {
        passwordMinLength: 8,
        requireStrongPasswords: false,
        passwordRequireSpecialChars: false
      };
    } catch (error) {
      console.error('Failed to get password requirements:', error);
      // Return safe defaults on error
      return {
        passwordMinLength: 8,
        requireStrongPasswords: false,
        passwordRequireSpecialChars: false
      };
    }
  }

  /**
   * Verify email with token from verification link
   * Public endpoint - no authentication required
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>('/public/auth/verify-email', { token });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Email verification failed');
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Email verification failed');
    }
  }

  /**
   * Resend verification email (public endpoint - no authentication required)
   * Rate limited - 5 minute cooldown between requests
   * @param usernameOrEmail - Username or email address to send verification to
   */
  async resendVerificationEmail(usernameOrEmail: string): Promise<void> {
    try {
      const response = await httpClient.post<{ success: boolean; message: string }>(
        '/public/auth/resend-verification',
        { usernameOrEmail }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Failed to resend verification email');
    }
  }

  /**
   * Get email verification status for authenticated user
   */
  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    try {
      const response = await httpClient.get<VerificationStatusResponse>('/auth/verification-status');
      return response.data;
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Failed to get verification status');
    }
  }

  /**
   * Reset password using token (public endpoint - no auth required)
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    try {
      await httpClient.post('/public/auth/reset-password', {
        token,
        newPassword
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as Error).message);
      }
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Logout user (SessionManager handles cleanup)
   */
  async logout(): Promise<void> {
    // SessionManager will handle token cleanup and HTTP client state
    queryClient.clear(); // Clear all React Query cache on logout
  }

}

// Singleton instance
export const authService = new AuthService();
export const authenticationService = authService; // Alias for consistency
