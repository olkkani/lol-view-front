import { useQuery } from '@tanstack/react-query';
import { fetchMe } from './fetchMe';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });
}
