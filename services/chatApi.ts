import Constants from 'expo-constants';

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type ActivityType =
  | 'weight-training'
  | 'calisthenics'
  | 'cardio'
  | 'mobility'
  | 'recovery'
  | 'sports'
  | 'other';

export interface ParsedActivity {
  date: string;
  exercises: string[];
  type: ActivityType;
  isRecurring: boolean;
  weeksToRepeat: number;
}

export interface ChatResponse {
  message: {
    role: 'assistant';
    content: string;
  };
  activities?: ParsedActivity[];
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

export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'done'; content: string; activities: ParsedActivity[] }
  | { type: 'error'; message: string };

export function streamChatMessage(
  accessToken: string,
  messages: ChatMessage[],
  callbacks: {
    onToken: (text: string) => void;
    onDone: (content: string, activities: ParsedActivity[]) => void;
    onError: (message: string) => void;
  },
  options?: {
    activityContext?: string;
    sessionId?: string;
    sessionTitle?: string;
  }
): { abort: () => void } {
  const xhr = new XMLHttpRequest();
  let lastProcessedIndex = 0;

  xhr.open('POST', `${API_URL}/api/chat`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

  xhr.onreadystatechange = () => {
    if (xhr.readyState >= 3 && xhr.responseText) {
      const newText = xhr.responseText.substring(lastProcessedIndex);
      lastProcessedIndex = xhr.responseText.length;

      const lines = newText.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const event: StreamEvent = JSON.parse(line);
          if (event.type === 'token') {
            callbacks.onToken(event.content);
          } else if (event.type === 'done') {
            callbacks.onDone(event.content, event.activities);
          } else if (event.type === 'error') {
            callbacks.onError(event.message);
          }
        } catch {
          // Partial JSON line, will be completed in next chunk
        }
      }
    }
  };

  xhr.onerror = () => {
    callbacks.onError('Network error');
  };

  xhr.send(
    JSON.stringify({
      messages,
      stream: true,
      activityContext: options?.activityContext,
      sessionId: options?.sessionId,
      sessionTitle: options?.sessionTitle,
    })
  );

  return {
    abort: () => {
      try {
        xhr.abort();
      } catch {
        // Already aborted or completed
      }
    },
  };
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

export type ChatSuggestions = Record<string, string[]>;

export async function getChatSuggestions(): Promise<ChatSuggestions> {
  const response = await fetch(`${API_URL}/api/suggestions`);
  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }
  return response.json();
}
