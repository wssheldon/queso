import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useSignup, useLogin } from '@/api/auth';
import { toast } from 'sonner';
import { isAxiosError } from '@/api/client';

export const Route = createFileRoute('/signup')({
  component: SignupComponent,
});

interface ErrorResponse {
  error: string;
}

function SignupComponent() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const signup = useSignup();
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Basic validation
    const errors: { [key: string]: string } = {};
    if (!username) errors.username = 'Please enter a username';
    if (!email) errors.email = 'Please enter your email';
    if (!password) errors.password = 'Please enter a password';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    signup.mutate(
      { username, email, password },
      {
        onSuccess: () => {
          // After successful signup, automatically log the user in with email
          login.mutate(
            { email, password },
            {
              onSuccess: () => {
                toast.success('Account created successfully. You are now logged in.');
                navigate({ to: '/' });
              },
              onError: () => {
                toast.error('Account created but login failed. Please try logging in.');
                navigate({ to: '/login' });
              },
            }
          );
        },
        onError: (error: unknown) => {
          if (isAxiosError(error) && error.response?.data) {
            const data = error.response.data as ErrorResponse;
            const errorMessage = data.error || 'An error occurred during signup';
            toast.error(errorMessage);

            // Set field-specific errors if the message indicates which field
            if (errorMessage.toLowerCase().includes('username')) {
              setFormErrors(prev => ({ ...prev, username: errorMessage }));
            } else if (errorMessage.toLowerCase().includes('email')) {
              setFormErrors(prev => ({ ...prev, email: errorMessage }));
            }
          }
        },
      }
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-2xl">🧀</div>
          <h1 className="text-xl font-semibold text-white">Create account</h1>
        </div>

        {/* Signup Form */}
        <div className="rounded-lg bg-[#1a1a1a] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm text-white">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setFormErrors(prev => ({ ...prev, username: '' }));
                }}
                className="h-12 bg-[#141414] text-white placeholder:text-gray-500"
                required
                disabled={signup.isPending}
              />
              {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm text-white">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setFormErrors(prev => ({ ...prev, email: '' }));
                }}
                className="h-12 bg-[#141414] text-white placeholder:text-gray-500"
                required
                disabled={signup.isPending}
              />
              {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm text-white">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setFormErrors(prev => ({ ...prev, password: '' }));
                }}
                className="h-12 bg-[#141414] text-white placeholder:text-gray-500"
                required
                disabled={signup.isPending}
              />
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-white text-black hover:bg-white/90"
              disabled={signup.isPending || login.isPending}
            >
              {signup.isPending || login.isPending ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>

        {/* Sign in link */}
        <div className="text-center text-sm">
          <span className="text-gray-500">Already have an account? </span>
          <Button
            variant="link"
            className="h-auto p-0 text-white hover:text-white/90"
            onClick={() => navigate({ to: '/login' })}
          >
            Sign in
          </Button>
        </div>
      </div>
    </main>
  );
}
