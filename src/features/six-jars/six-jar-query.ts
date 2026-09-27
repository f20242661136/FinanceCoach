import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  calculateSixJarAllocation,
  getSixJarProfile,
  saveSixJarProfile,
} from './six-jar-service';

import type {
  SaveSixJarProfileInput,
} from './six-jar-contract';


export const sixJarKeys = {
  all:
    [
      'six-jars',
    ] as const,

  profile:
    [
      'six-jars',
      'profile',
    ] as const,
};


export function
useSixJarProfile() {
  return useQuery({
    queryKey:
      sixJarKeys.profile,

    queryFn:
      getSixJarProfile,

    retry:
      1,

    staleTime:
      30_000,
  });
}


export function
useSaveSixJarProfile() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'six-jars',
      'save-profile',
    ],

    mutationFn:
      (
        input:
          SaveSixJarProfileInput,
      ) =>
        saveSixJarProfile(
          input,
        ),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              sixJarKeys.all,
          });
      },
  });
}


export function
useCalculateSixJarAllocation() {
  return useMutation({
    mutationKey: [
      'six-jars',
      'calculate',
    ],

    mutationFn:
      (
        incomeMinor: string,
      ) =>
        calculateSixJarAllocation(
          incomeMinor,
        ),
  });
}