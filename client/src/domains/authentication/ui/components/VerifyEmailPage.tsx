/**
 * VerifyEmailPage - Email verification landing page
 *
 * Handles email verification when user clicks link from their email.
 * Reads token from URL, calls backend, shows status, then redirects to login.
 */

import React, { useEffect, useState, useRef } from 'react';

import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { authService } from '../../services/AuthenticationService';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string>('');

  // Store timer ID for cleanup
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

    // Cleanup timer on unmount
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [searchParams, navigate]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-border">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-dark mb-2">Verifying Your Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-border">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-dark mb-2">Email Verified!</h2>
            <p className="text-gray-600">Your email has been successfully verified.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-emerald-800 font-medium">
              Redirecting to login in 3 seconds...
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-accent text-white font-medium rounded-lg transition-all duration-150 shadow-md hover:shadow-lg"
          >
            Go to Login Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-border">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
            <XCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-dark mb-2">Verification Failed</h2>
          <p className="text-gray-600">{error}</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 font-medium mb-2">Common reasons for failure:</p>
          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
            <li>Verification link expired (48 hours)</li>
            <li>Link already used</li>
            <li>Invalid or corrupted token</li>
          </ul>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-accent text-white font-medium rounded-lg transition-all duration-150 shadow-md hover:shadow-lg"
        >
          Back to Login
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
