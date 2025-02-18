import { Button } from '@/components/ui/button';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useLogin, useGoogleLogin } from '@/api/auth';
import { toast } from 'sonner';
import { PostHog } from '@/config/posthog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: LoginFormData) => void;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AuthFormField
        label="Email"
        type="email"
        placeholder="Your email address"
        error={errors.email?.message}
        disabled={isLoading}
        {...register('email')}
      />

      <AuthFormField
        label="Password"
        type="password"
        placeholder="Your password"
        error={errors.password?.message}
        disabled={isLoading}
        {...register('password')}
      />

      <Button
        type="submit"
        className="h-12 w-full bg-white text-black hover:bg-white/90"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Continue'}
      </Button>
    </form>
  );
}

function useLoginFlow() {
  const navigate = useNavigate();
  const login = useLogin();
  const googleLogin = useGoogleLogin();

  const handleLogin = async (data: LoginFormData) => {
    login.mutate(data, {
      onSuccess: () => {
        toast.success('Logged in successfully');
        PostHog.capture('user_logged_in', { method: 'email' });
        navigate({ to: '/' });
      },
      onError: () => {
        toast.error('Invalid email or password');
        PostHog.capture('login_failed', { method: 'email' });
      },
    });
  };

  const handleGoogleLogin = () => {
    PostHog.capture('google_login_initiated');
    googleLogin.mutate(undefined, {
      onSuccess: data => {
        window.location.href = data.url;
      },
      onError: () => {
        toast.error('Failed to initiate Google login');
        PostHog.capture('google_login_failed');
      },
    });
  };

  return {
    handleLogin,
    handleGoogleLogin,
    isLoading: login.isPending,
    isGoogleLoading: googleLogin.isPending,
  };
}

export const Route = createFileRoute('/login')({
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const { handleLogin, handleGoogleLogin, isLoading, isGoogleLoading } = useLoginFlow();

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <>
          <span className="text-gray-500">Don't have an account? </span>
          <Button
            variant="link"
            className="h-auto p-0 text-white hover:text-white/90"
            onClick={() => navigate({ to: '/signup' })}
          >
            Sign up
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#1a1a1a] px-2 text-gray-500">OR</span>
          </div>
        </div>

        <SocialAuthButtons onGoogleClick={handleGoogleLogin} isGoogleLoading={isGoogleLoading} />
      </div>
    </AuthLayout>
  );
}
