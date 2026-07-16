import { getApiEndpoint } from '../config/api';
import { CoachProfile } from '../types/coachProfile';

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

export interface ParsedSetData {
  reps?: number;
  weight?: number;
  time?: number; // seconds
  distance?: number; // miles
}

export interface ParsedExercise {
  name: string;
  sets?: ParsedSetData[];
}

export interface ParsedActivity {
  date: string;
  exercises: string[];
  exerciseDetails?: ParsedExercise[];
  supersetGroups?: number[][];
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

// Server-enforced access errors: 402 = paywall (drop back to Paywall via
// refreshEntitlements), 429 monthly_limit = fair-use cap reached.
export type ChatErrorCode = 'subscription_required' | 'monthly_limit';

export function mapAccessError(
  status: number,
  body: unknown
): { message: string; code: ChatErrorCode } | null {
  const errorTag =
    body && typeof body === 'object' ? (body as any).error : undefined;
  if (status === 402) {
    return {
      message: 'An active subscription is required to use the coach.',
      code: 'subscription_required',
    };
  }
  if (status === 429 && errorTag === 'monthly_limit') {
    const resetsAt = (body as any)?.resetsAt;
    const resetDate = resetsAt ? new Date(resetsAt) : null;
    const when =
      resetDate && !isNaN(resetDate.getTime())
        ? resetDate.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
          })
        : 'next month';
    return {
      message: `You've reached this month's coaching limit — resets ${when}.`,
      code: 'monthly_limit',
    };
  }
  return null;
}

export function streamChatMessage(
  accessToken: string,
  messages: ChatMessage[],
  callbacks: {
    onToken: (text: string) => void;
    onDone: (content: string, activities: ParsedActivity[]) => void;
    onError: (message: string, code?: ChatErrorCode) => void;
  },
  options?: {
    activityContext?: string;
    sessionId?: string;
    sessionTitle?: string;
    mode?: 'plan';
    coachProfile?: CoachProfile | null;
  }
): { abort: () => void } {
  const xhr = new XMLHttpRequest();
  let lastProcessedIndex = 0;

  xhr.open('POST', getApiEndpoint('/api/chat'));
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

  xhr.onreadystatechange = () => {
    // Error responses (paywall 402, rate/usage limits 429, ...) are plain
    // JSON, not NDJSON — surface them instead of feeding the line parser.
    if (xhr.readyState === 4 && xhr.status >= 400) {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON error body
      }
      const accessError = mapAccessError(xhr.status, body);
      if (accessError) {
        callbacks.onError(accessError.message, accessError.code);
      } else {
        callbacks.onError((body as any)?.error || 'Failed to send message');
      }
      return;
    }

    if (xhr.readyState >= 3 && xhr.status < 400 && xhr.responseText) {
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
      mode: options?.mode,
      coachProfile: options?.coachProfile,
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
  const response = await fetch(getApiEndpoint('/api/chat'), {
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
    const error = await response.json().catch(() => null);
    const accessError = mapAccessError(response.status, error);
    throw new Error(
      accessError?.message || error?.error || 'Failed to send message'
    );
  }

  return response.json();
}

export async function getChatSessions(
  accessToken: string
): Promise<ChatSession[]> {
  const response = await fetch(getApiEndpoint('/api/chat-history'), {
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
    getApiEndpoint(`/api/chat-history?sessionId=${sessionId}`),
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
    getApiEndpoint(`/api/chat-history?sessionId=${sessionId}`),
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
  const response = await fetch(getApiEndpoint('/api/suggestions'));
  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }
  return response.json();
}
