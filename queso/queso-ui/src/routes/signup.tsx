import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { isAxiosError } from '@/api/client';
import { useSignup, useLogin } from '@/api/auth';
import { toast } from 'sonner';

export const Route = createFileRoute('/signup')({
  component: SignupComponent,
});

function SignupComponent() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const signup = useSignup();
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate(
      { username, email, password },
      {
        onSuccess: () => {
          // After successful signup, automatically log the user in
          login.mutate(
            { username, password },
            {
              onSuccess: () => {
                toast.success('Account created successfully. You are now logged in.');
                navigate({ to: '/' });
              },
              onError: error => {
                if (isAxiosError(error)) {
                  toast.error('Account created but login failed. Please try logging in.');
                  navigate({ to: '/login' });
                }
              },
            }
          );
        },
        onError: (error: unknown) => {
          if (isAxiosError(error)) {
            const errorMessage = error.response?.data?.error || 'An error occurred during signup';
            toast.error(errorMessage);

            // Focus the appropriate field based on the error
            if (errorMessage.includes('Username')) {
              document.getElementById('username')?.focus();
            } else if (errorMessage.includes('Email')) {
              document.getElementById('email')?.focus();
            }
          }
        },
      }
    );
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-[--background] p-4">
      <div className="w-full max-w-[400px]">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Create an account</CardTitle>
            <CardDescription>Sign up to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  disabled={signup.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={signup.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={signup.isPending}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={signup.isPending || login.isPending}
              >
                {signup.isPending || login.isPending ? 'Creating account...' : 'Sign up'}
              </Button>
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Button
                  variant="link"
                  className="h-auto p-0 font-normal"
                  onClick={() => navigate({ to: '/login' })}
                >
                  Sign in
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
