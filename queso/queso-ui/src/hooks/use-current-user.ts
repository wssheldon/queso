import { useQuery } from '@tanstack/react-query';
import { auth, User } from '@/api/client';

export function useCurrentUser() {
  const query = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: () => auth.getUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
} 