import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/api/client';

export function useAuth() {
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Logout failed:', error);
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
