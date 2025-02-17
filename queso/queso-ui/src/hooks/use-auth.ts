import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/api/client';
import { PostHog } from '@/config/posthog';

export function useAuth() {
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      await auth.logout();
      PostHog.capture('user_logged_out');
      PostHog.reset(); // Reset the user identification
    } catch (error) {
      console.error('Logout failed:', error);
      PostHog.capture('user_logout_failed', { error: String(error) });
    } finally {
      // Clear all queries from the cache
      queryClient.clear();
      // Remove the token from localStorage
      localStorage.removeItem('token');
    }
  };

  return {
    logout,
  };
}
