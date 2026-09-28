import type { ProfileData, ProfileDto } from '@docunex/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const profileKey = ['profile'] as const;

export function useProfile() {
  return useQuery({ queryKey: profileKey, queryFn: () => api<ProfileDto>('/profile') });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileData) => api<ProfileDto>('/profile', { method: 'PUT', json: input }),
    onSuccess: (profile) => queryClient.setQueryData(profileKey, profile),
  });
}
