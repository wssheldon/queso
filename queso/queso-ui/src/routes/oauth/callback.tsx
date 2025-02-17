import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/oauth/callback')({
  component: OAuthCallbackComponent,
});

function OAuthCallbackComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('auth_token', token);
      toast.success('Successfully logged in with Google');
      navigate({ to: '/' });
    } else {
      toast.error('Failed to authenticate with Google');
      navigate({ to: '/login' });
    }
  }, [navigate]);

  return (
    <main className="flex flex-1 items-center justify-center bg-[--background] p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Processing login...</h1>
        <p className="text-muted-foreground">Please wait while we complete your login.</p>
      </div>
    </main>
  );
}
