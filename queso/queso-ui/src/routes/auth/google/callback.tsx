import { createRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Route as rootRoute } from '@/routes/__root';
import { useExchangeGoogleCode } from '@/api/auth';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/api/auth/google/callback',
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
            navigate({ to: '/' });
          },
          onError: () => {
            toast.error('Failed to complete Google authentication');
            navigate({ to: '/login' });
          },
        }
      );
    } else {
      toast.error('Invalid authentication response');
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
