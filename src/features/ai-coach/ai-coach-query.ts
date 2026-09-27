import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as Crypto from 'expo-crypto';

import {
  archiveAiConversation,
  createAiConversation,
  generateAiFinancialInsight,
  getAiConversations,
  getAiMessages,
  getFinancialInsights,
  sendAiCoachMessage,
} from './ai-coach-service';


export const aiCoachKeys = {
  all:
    [
      'ai-coach',
    ] as const,

  conversations:
    [
      'ai-coach',
      'conversations',
    ] as const,

  messages:
    (
      conversationId: string,
    ) =>
      [
        'ai-coach',
        'messages',
        conversationId,
      ] as const,

  insights:
    [
      'ai-coach',
      'insights',
    ] as const,
};


export function
useAiConversations() {
  return useQuery({
    queryKey:
      aiCoachKeys.conversations,

    queryFn:
      getAiConversations,

    retry:
      1,

    staleTime:
      30_000,
  });
}


export function
useAiMessages(
  conversationId: string,
) {
  return useQuery({
    queryKey:
      aiCoachKeys.messages(
        conversationId,
      ),

    queryFn:
      () =>
        getAiMessages(
          conversationId,
        ),

    enabled:
      Boolean(
        conversationId,
      ),

    retry:
      1,

    staleTime:
      5_000,
  });
}


export function
useFinancialInsights() {
  return useQuery({
    queryKey:
      aiCoachKeys.insights,

    queryFn:
      getFinancialInsights,

    retry:
      1,

    staleTime:
      60_000,
  });
}


export function
useCreateAiConversation() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'ai-coach',
      'create-conversation',
    ],

    mutationFn:
      (
        title:
          string
          | undefined,
      ) =>
        createAiConversation(
          Crypto.randomUUID(),
          title,
        ),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              aiCoachKeys.conversations,
          });
      },
  });
}


export function
useArchiveAiConversation() {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'ai-coach',
      'archive-conversation',
    ],

    mutationFn:
      archiveAiConversation,

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              aiCoachKeys.all,
          });
      },
  });
}


export function
useSendAiCoachMessage(
  conversationId: string,
  timezone: string,
) {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'ai-coach',
      'send',
      conversationId,
    ],

    mutationFn:
      (
        message: string,
      ) =>
        sendAiCoachMessage({
          conversationId,

          userMessageId:
            Crypto.randomUUID(),

          assistantMessageId:
            Crypto.randomUUID(),

          message,

          timezone,
        }),

    onSuccess:
      async () => {
        await Promise.all([
          queryClient
            .invalidateQueries({
              queryKey:
                aiCoachKeys.messages(
                  conversationId,
                ),
            }),

          queryClient
            .invalidateQueries({
              queryKey:
                aiCoachKeys.conversations,
            }),
        ]);
      },
  });
}


export function
useGenerateAiFinancialInsight(
  timezone: string,
) {
  const queryClient =
    useQueryClient();


  return useMutation({
    mutationKey: [
      'ai-coach',
      'generate-insight',
    ],

    mutationFn:
      () =>
        generateAiFinancialInsight(
          timezone,
        ),

    onSuccess:
      async () => {
        await queryClient
          .invalidateQueries({
            queryKey:
              aiCoachKeys.insights,
          });
      },
  });
}