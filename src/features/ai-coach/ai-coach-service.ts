import {
  supabase,
} from '../../lib/supabase';

import {
  aiCoachSendResponseSchema,
  aiConversationListSchema,
  aiFinancialContextSchema,
  aiGeneratedInsightResponseSchema,
  aiMessageListSchema,
  financialInsightListSchema,
  type AiCoachSendResponse,
  type AiConversation,
  type AiFinancialContext,
  type AiGeneratedInsightResponse,
  type AiMessage,
  type FinancialInsight,
} from './ai-coach-contract';


type RpcResult = {
  data: unknown;

  error: {
    message: string;
    code?: string;
  } | null;
};


const callRpc =
  supabase.rpc.bind(
    supabase,
  ) as unknown as (
    functionName: string,
    args?: Record<
      string,
      unknown
    >,
  ) => Promise<RpcResult>;


export async function
createAiConversation(
  conversationId: string,
  title = 'Finance Coach',
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'create_ai_conversation',
      {
        p_conversation_id:
          conversationId,

        p_title:
          title,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !== 'string'
  ) {
    throw new Error(
      'Conversation creation returned an invalid response.',
    );
  }


  return data;
}


export async function
archiveAiConversation(
  conversationId: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'archive_ai_conversation',
      {
        p_conversation_id:
          conversationId,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !== 'string'
  ) {
    throw new Error(
      'Conversation archive returned an invalid response.',
    );
  }


  return data;
}


export async function
getAiConversations():
  Promise<
    AiConversation[]
  > {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_ai_conversations',
      {
        p_limit:
          30,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return aiConversationListSchema
    .parse(
      data,
    );
}


export async function
getAiMessages(
  conversationId: string,
): Promise<AiMessage[]> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_ai_messages',
      {
        p_conversation_id:
          conversationId,

        p_limit:
          100,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return aiMessageListSchema
    .parse(
      data,
    );
}


export async function
getFinancialInsights():
  Promise<
    FinancialInsight[]
  > {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_financial_insights',
      {
        p_limit:
          20,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return financialInsightListSchema
    .parse(
      data,
    );
}


export async function
getAiFinancialContext(
  timezone: string,
): Promise<AiFinancialContext> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_ai_financial_context',
      {
        p_timezone:
          timezone,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return aiFinancialContextSchema
    .parse(
      data,
    );
}


export type SendAiCoachMessageInput = {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  message: string;
  timezone: string;
};


export async function
sendAiCoachMessage(
  input:
    SendAiCoachMessageInput,
): Promise<AiCoachSendResponse> {
  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        'ai-coach',
        {
          body: {
            action:
              'chat',

            conversationId:
              input.conversationId,

            userMessageId:
              input.userMessageId,

            assistantMessageId:
              input.assistantMessageId,

            message:
              input.message,

            timezone:
              input.timezone,
          },
        },
      );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    data
    &&
    typeof data ===
      'object'
    &&
    'error' in data
    &&
    typeof data.error ===
      'string'
  ) {
    throw new Error(
      data.error,
    );
  }


  return aiCoachSendResponseSchema
    .parse(
      data,
    );
}


export async function
generateAiFinancialInsight(
  timezone: string,
): Promise<AiGeneratedInsightResponse> {
  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        'ai-coach',
        {
          body: {
            action:
              'generate_insight',

            timezone,
          },
        },
      );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    data
    &&
    typeof data ===
      'object'
    &&
    'error' in data
    &&
    typeof data.error ===
      'string'
  ) {
    throw new Error(
      data.error,
    );
  }


  return aiGeneratedInsightResponseSchema
    .parse(
      data,
    );
}