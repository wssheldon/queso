import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useLogin, useGoogleLogin } from '@/api/auth';
import { toast } from 'sonner';

export const Route = createFileRoute('/login')({
  component: LoginComponent,
});

function LoginComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();
  const login = useLogin();
  const googleLogin = useGoogleLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!email) {
      setEmailError('Please enter your email');
      return;
    }

    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success('Logged in successfully');
          navigate({ to: '/' });
        },
        onError: () => {
          toast.error('Invalid email or password');
        },
      }
    );
  };

  const handleGoogleLogin = () => {
    googleLogin.mutate(undefined, {
      onSuccess: data => {
        window.location.href = data.url;
      },
      onError: () => {
        toast.error('Failed to initiate Google login');
      },
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-2xl">🧀</div>
          <h1 className="text-xl font-semibold text-white">Sign in</h1>
        </div>

        {/* Login Form */}
        <div className="rounded-lg bg-[#1a1a1a] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm text-white">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                className="h-12 bg-[#141414] text-white placeholder:text-gray-500"
                required
                disabled={login.isPending}
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm text-white">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 bg-[#141414] text-white placeholder:text-gray-500"
                required
                disabled={login.isPending}
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-white text-black hover:bg-white/90"
              disabled={login.isPending}
            >
              {login.isPending ? 'Signing in...' : 'Continue'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#1a1a1a] px-2 text-gray-500">OR</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-gray-800 bg-transparent text-white hover:bg-white/5"
                onClick={handleGoogleLogin}
                disabled={googleLogin.isPending}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                  ></path>
                </svg>
                {googleLogin.isPending ? 'Connecting...' : 'Continue with Google'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-gray-800 bg-transparent text-white hover:bg-white/5"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  aria-hidden="true"
                  focusable="false"
                  role="img"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                  />
                </svg>
                Continue with GitHub
              </Button>
            </div>
          </form>
        </div>

        {/* Sign up link */}
        <div className="text-center text-sm">
          <span className="text-gray-500">Don't have an account? </span>
          <Button
            variant="link"
            className="h-auto p-0 text-white hover:text-white/90"
            onClick={() => navigate({ to: '/signup' })}
          >
            Sign up
          </Button>
        </div>
      </div>
    </main>
  );
}
