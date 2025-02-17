import { createRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Route as rootRoute } from '@/routes/__root';
import { useExchangeGoogleCode } from '@/api/auth';
import { PostHog } from '@/config/posthog';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/google/callback',
  component: OAuthCallbackComponent,
});

function OAuthCallbackComponent() {
  const navigate = useNavigate();
  const exchangeCode = useExchangeGoogleCode();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const state = params.get('state');

    if (error) {
      toast.error('Failed to authenticate with Google');
      PostHog.capture('google_oauth_error', { error });
      navigate({ to: '/login' });
      return;
    }

    if (code && state) {
      exchangeCode.mutate(
        { code, state },
        {
          onSuccess: response => {
            localStorage.setItem('auth_token', response.token);
            toast.success('Successfully logged in with Google');
            PostHog.capture('user_logged_in', { method: 'google' });
            navigate({ to: '/' });
          },
          onError: () => {
            toast.error('Failed to complete Google authentication');
            PostHog.capture('google_oauth_exchange_failed');
            navigate({ to: '/login' });
          },
        }
      );
    } else {
      toast.error('Invalid authentication response');
      PostHog.capture('google_oauth_invalid_params', {
        has_code: Boolean(code),
        has_state: Boolean(state),
      });
      navigate({ to: '/login' });
    }
  }, [navigate, exchangeCode]);

  return (
    <main className="flex flex-1 items-center justify-center bg-[--background] p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Processing login...</h1>
        <p className="text-muted-foreground">Please wait while we complete your login.</p>
      </div>
    </main>
  );
}
