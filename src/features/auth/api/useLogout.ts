import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from './logout';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
    },
  });
}
