import { Button } from '@/components/ui/button';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSignup, useLogin } from '@/api/auth';
import { isAxiosError } from '@/api/client';
import { PostHog } from '@/config/posthog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { toast } from 'sonner';

const signupSchema = z.object({
  username: z.string().min(1, 'Please enter a username'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface ApiErrorResponse {
  error: string;
}

function SignupForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: SignupFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AuthFormField
        label="Username"
        type="text"
        placeholder="Choose a username"
        error={errors.username?.message}
        disabled={isLoading}
        {...register('username')}
      />

      <AuthFormField
        label="Email"
        type="email"
        placeholder="Enter your email"
        error={errors.email?.message}
        disabled={isLoading}
        {...register('email')}
      />

      <AuthFormField
        label="Password"
        type="password"
        placeholder="Create a password"
        error={errors.password?.message}
        disabled={isLoading}
        {...register('password')}
      />

      <Button
        type="submit"
        className="h-12 w-full bg-white text-black hover:bg-white/90"
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}

function useSignupFlow() {
  const navigate = useNavigate();
  const signup = useSignup();
  const login = useLogin();

  const handleSignup = async (data: SignupFormData) => {
    try {
      await signup.mutateAsync(data);
      PostHog.capture('user_signed_up', { method: 'email' });

      // Auto-login is in the same try block to ensure atomicity
      // If login fails, we still want to handle it as a signup error
      await login.mutateAsync({
        email: data.email,
        password: data.password,
      });

      PostHog.capture('user_logged_in', { method: 'email', source: 'signup' });
      PostHog.identify(data.email);

      toast.success('Account created successfully. You are now logged in.');
      navigate({ to: '/' });
    } catch (error) {
      if (isAxiosError(error) && error.response?.data) {
        const response = error.response.data as ApiErrorResponse;
        const errorMessage = response.error || 'An error occurred during signup';
        toast.error(errorMessage);

        // We parse error messages for field-specific errors to:
        // 1. Maintain backwards compatibility with API changes
        // 2. Provide more specific analytics data
        // 3. Enable better error tracking and debugging
        const reason = errorMessage.toLowerCase().includes('username')
          ? 'username_error'
          : errorMessage.toLowerCase().includes('email')
            ? 'email_error'
            : 'unknown';

        PostHog.capture('signup_failed', { reason, error: errorMessage });
      }
    }
  };

  return {
    handleSignup,
    isLoading: signup.isPending || login.isPending,
  };
}

export const Route = createFileRoute('/signup')({
  component: SignupComponent,
});

function SignupComponent() {
  const navigate = useNavigate();
  const { handleSignup, isLoading } = useSignupFlow();

  return (
    <AuthLayout
      title="Create account"
      footer={
        <>
          <span className="text-gray-500">Already have an account? </span>
          <Button
            variant="link"
            className="h-auto p-0 text-white hover:text-white/90"
            onClick={() => navigate({ to: '/login' })}
          >
            Sign in
          </Button>
        </>
      }
    >
      <SignupForm onSubmit={handleSignup} isLoading={isLoading} />
    </AuthLayout>
  );
}
