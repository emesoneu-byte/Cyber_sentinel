import { get, post, del } from './client';
export interface CoachMessage { id: string; role: 'user'|'assistant'; content: string; created_at: string; }
export const coachApi = {
  send: (message: string) => post<{ reply: string; suggestedFollowUps: string[]; mode?: 'live' | 'offline' }>('/coach/message', { message }),
  history: () => get<{ messages: CoachMessage[] }>('/coach/history'),
  clear: () => del<{ message: string }>('/coach/history'),
};
