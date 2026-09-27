import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getGamificationSummary,
  refreshGamificationChallenge,
  startGamificationChallenge,
} from './gamification-service';


export const gamificationKeys = {
  all:
    [
      'gamification',
    ] as const,

  summary:
    (
      timezone: string,
    ) =>
      [
        'gamification',
        'summary',
        timezone,
      ] as const,
};


export function
useGamificationSummary(
  timezone: string,
) {
  return useQuery({
    queryKey:
      gamificationKeys.summary(
        timezone,
      ),

    queryFn:
      () =>
        getGamificationSummary(
          timezone,
        ),

    enabled:
      Boolean(
        timezone,
      ),

    retry:
      1,

    staleTime:
      30_000,
  });
}


export function
useStartGamificationChallenge(
  timezone: string,
) {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'gamification',
      'start-challenge',
    ],

    mutationFn:
      (
        challengeId: string,
      ) =>
        startGamificationChallenge(
          challengeId,
          timezone,
        ),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              gamificationKeys.all,
          });
      },
  });
}


export function
useRefreshGamificationChallenge(
  timezone: string,
) {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'gamification',
      'refresh-challenge',
    ],

    mutationFn:
      refreshGamificationChallenge,

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              gamificationKeys.summary(
                timezone,
              ),
          });
      },
  });
}