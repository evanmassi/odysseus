/**
 * Email Verification Landing Page
 *
 * Reads token from URL, verifies via backend, then redirects to login.
 */

import { type ReactNode, useEffect, useState, useRef } from 'react';

import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { authService } from '@domains/authentication/services/AuthService';

function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-border">
        {children}
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string>('');

  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('Invalid verification link. Token is missing.');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');

        // Redirect to home (login modal) after 3 seconds
        redirectTimerRef.current = window.setTimeout(() => {
          void navigate('/');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      }
    };

    void verifyEmail();

    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [searchParams, navigate]);

  if (status === 'verifying') {
    return (
      <VerifyEmailLayout>
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-card-foreground mb-2">Verifying Your Email</h2>
          <p className="text-secondary-foreground">
            Please wait while we verify your email address...
          </p>
        </div>
      </VerifyEmailLayout>
    );
  }

  if (status === 'success') {
    return (
      <VerifyEmailLayout>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-success-bg to-success-hover flex items-center justify-center shadow-lg">
            <CheckCircle className="w-10 h-10 text-success-btnText" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-card-foreground mb-2">Email Verified!</h2>
          <p className="text-secondary-foreground">Your email has been successfully verified.</p>
        </div>

        <div className="bg-success-light border border-success-border rounded-lg p-4 mb-6">
          <p className="text-sm text-success-text font-medium">
            Redirecting to login in 3 seconds...
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-150 shadow-md hover:shadow-lg"
        >
          Go to Login Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </VerifyEmailLayout>
    );
  }

  return (
    <VerifyEmailLayout>
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-danger-bg to-danger-hover flex items-center justify-center shadow-lg">
          <XCircle className="w-10 h-10 text-white" />
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Verification Failed</h2>
        <p className="text-secondary-foreground">{error}</p>
      </div>

      <div className="bg-muted border border-danger-border rounded-lg p-4 mb-6">
        <p className="text-sm text-danger-text font-medium mb-2">Common reasons for failure:</p>
        <ul className="text-sm text-danger-text space-y-1 list-disc list-inside">
          <li>Verification link expired (48 hours)</li>
          <li>Link already used</li>
          <li>Invalid or corrupted token</li>
        </ul>
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-150 shadow-md hover:shadow-lg"
      >
        Back to Login
        <ArrowRight className="w-4 h-4" />
      </button>
    </VerifyEmailLayout>
  );
}
