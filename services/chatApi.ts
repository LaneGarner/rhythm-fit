import Constants from 'expo-constants';

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  message: {
    role: 'assistant';
    content: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatHistoryResponse {
  sessions?: ChatSession[];
  session?: ChatSession;
  messages?: ChatMessage[];
}

export async function sendChatMessage(
  accessToken: string,
  messages: ChatMessage[],
  options?: {
    activityContext?: string;
    sessionId?: string;
    sessionTitle?: string;
  }
): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages,
      activityContext: options?.activityContext,
      sessionId: options?.sessionId,
      sessionTitle: options?.sessionTitle,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

export async function getChatSessions(
  accessToken: string
): Promise<ChatSession[]> {
  const response = await fetch(`${API_URL}/api/chat-history`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch sessions');
  }

  const data: ChatHistoryResponse = await response.json();
  return data.sessions || [];
}

export async function getChatSession(
  accessToken: string,
  sessionId: string
): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  const response = await fetch(
    `${API_URL}/api/chat-history?sessionId=${sessionId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch session');
  }

  const data: ChatHistoryResponse = await response.json();
  return {
    session: data.session!,
    messages: data.messages || [],
  };
}

export async function deleteChatSession(
  accessToken: string,
  sessionId: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/chat-history?sessionId=${sessionId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete session');
  }
}

export function isApiConfigured(): boolean {
  return Boolean(API_URL);
}
