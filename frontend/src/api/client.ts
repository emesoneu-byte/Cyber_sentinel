const BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export const tokens = {
  get access()  { return localStorage.getItem('sg_access') ?? ''; },
  get refresh() { return localStorage.getItem('sg_refresh') ?? ''; },
  get userId()  { return localStorage.getItem('sg_uid') ?? ''; },
  set(access: string, refresh: string, userId: string) { localStorage.setItem('sg_access',access); localStorage.setItem('sg_refresh',refresh); localStorage.setItem('sg_uid',userId); },
  clear() { localStorage.removeItem('sg_access'); localStorage.removeItem('sg_refresh'); localStorage.removeItem('sg_uid'); },
};

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string,string> ?? {}) };
  // Do not send stale tokens on login/register
  const isAuthForm = path.startsWith('/auth/login') || path.startsWith('/auth/register');
  if (tokens.access && !isAuthForm) headers['Authorization'] = `Bearer ${tokens.access}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401 && retry && !isAuthForm) {
    const body = await res.clone().json().catch(() => ({})) as { code?: string; error?: string };
    if (body.code === 'TOKEN_EXPIRED' && tokens.refresh && tokens.userId) {
      const refreshed = await fetch(`${BASE}/auth/refresh`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refreshToken: tokens.refresh, userId: tokens.userId }) });
      if (refreshed.ok) { const d = await refreshed.json() as { accessToken: string }; localStorage.setItem('sg_access', d.accessToken); return request<T>(path, options, false); }
    }
    // Only call it session expired if we actually had a session
    if (tokens.access || tokens.refresh) {
      tokens.clear();
      window.dispatchEvent(new Event('sg:logout'));
      throw new Error('Session expired — please sign in again');
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string; errors?: Array<{ field: string; message: string }> };
    if (err.errors?.length) throw new Error(err.errors.map(e => e.message).join('; '));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const get  = <T>(path: string) => request<T>(path, { method: 'GET' });
export const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch= <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del  = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export interface User { id: string; email: string; username: string; role: string; department: string|null; xp: number; streak: number; last_active: string|null; created_at: string; is_active?: number; }
export interface BadgeView { id: string; label: string; desc: string; icon: string; earned: boolean; earnedAt: string|null; }
export interface SimResult { scenario_id: number; category: string; difficulty: string; passed: number; chosen: number; xp_earned: number; time_taken: number|null; completed_at: string; }
export interface AuthResponse { user: User; accessToken: string; refreshToken: string; }
export interface EmailTemplate { id: string; name: string; category: string; difficulty: string; subject: string; sender_name: string; sender_email: string; html_body: string; red_flags: string[] | string; created_at: string; }
export interface Campaign { id: string; name: string; template_id: string; status: string; target_department: string|null; created_at: string; template_name?: string; category?: string; creator_name?: string; recipient_count?: number; clicked_count?: number; reported_count?: number; }

export const authApi = {
  register: (email: string, username: string, password: string, department?: string) => post<AuthResponse>('/auth/register', { email, username, password, department }),
  login: (email: string, password: string) => post<AuthResponse>('/auth/login', { email, password }),
  logout: (refreshToken: string) => post<{ message: string }>('/auth/logout', { refreshToken }),
};
export const userApi = {
  me: () => get<{ user: User }>('/users/me'),
  updateProfile: (data: { department?: string; currentPassword?: string; newPassword?: string }) => patch<{ user: User }>('/users/me', data),
  dashboard: () => get<{ xp: number; streak: number; stats: Record<string,number>; vulnProfile: Array<{category:string;total:number;passed:number;passRate:number|null;vulnScore:number|null}>; badges: BadgeView[]; recentQuizzes: unknown[]; recentSims: SimResult[] }>('/users/dashboard'),
  leaderboard: (limit=20) => get<{ leaderboard: Array<User&{rank:number;sims_passed:number;badge_count:number}> }>(`/users/leaderboard?limit=${limit}`),
};
export const simApi = {
  submit: (data: {scenarioId:number;category:string;difficulty:string;passed:boolean;chosen:number;timeTaken?:number}) => post<{xpEarned:number;newStreak:number;newBadges:BadgeView[];message:string}>('/simulations/results', data),
  myResults: () => get<{results:SimResult[];summary:{total:number;passed:number;passRate:number;byCategory:Record<string,{total:number;passed:number}>}}>('/simulations/results/me'),
};
export const quizApi = {
  submit: (score:number, total:number, answers:Array<{questionId:number;chosen:number;correct:boolean}>) => post<{id:string;pct:number;xpEarned:number;grade:string;newBadges:BadgeView[];message:string}>('/quiz/results', {score,total,answers}),
  history: () => get<{results:Array<{id:string;score:number;total:number;pct:number;xp_earned:number;completed_at:string}>;best:number|null;avg:number|null;attempts:number}>('/quiz/results/me'),
};
export const moduleApi = {
  complete: (moduleId:string) => post<{message:string;xpEarned:number;newBadges:BadgeView[]}>('/modules/complete', {moduleId}),
  progress: () => get<{progress:Array<{module_id:string;completed:number;xp_earned:number;completed_at:string|null}>}>('/modules/progress'),
};
export const adminApi = {
  users: (params?: { search?: string; role?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.limit) q.set('limit', String(params.limit));
    const s = q.toString();
    return get<{ users: User[]; total: number }>(`/admin/users${s ? '?' + s : ''}`);
  },
  updateUser: (id: string, data: { role?: string; department?: string; is_active?: boolean }) => patch<{ user: User }>(`/admin/users/${id}`, data),
  deleteUser: (id: string) => del<{ message: string }>(`/admin/users/${id}`),
  stats: () => get<{ overview: { totalUsers: number; totalSims: number; totalQuizzes: number; avgQuizPct: number }; simsByCategory: Array<{ category: string; attempts: number; passes: number; pass_rate: number }>; topUsers: Array<{ username: string; department: string|null; xp: number; sims_passed: number }> }>('/admin/stats'),
  audit: (limit = 50) => get<{ logs: Array<{ id: string; user_id: string|null; username?: string; action: string; detail: unknown; ip: string|null; created_at: string }> }>(`/admin/audit?limit=${limit}`),
  templates: () => get<{ templates: EmailTemplate[] }>('/admin/templates'),
  createTemplate: (data: { name: string; category: string; difficulty: string; subject: string; senderName: string; senderEmail: string; htmlBody: string; redFlags: string[] }) => post<{ template: EmailTemplate }>('/admin/templates', data),
  testEmail: (to?: string) => post<{ message: string }>('/admin/test-email', to ? { to } : {}),
  deleteTemplate: (id: string) => del<{ message: string }>(`/admin/templates/${id}`),
  campaigns: () => get<{ campaigns: Campaign[] }>('/admin/campaigns'),
  createCampaign: (data: { name: string; templateId: string; targetDepartment?: string }) => post<{ campaign: Campaign; recipientCount: number }>('/admin/campaigns', data),
  campaignDetail: (id: string) => get<{ campaign: Campaign; template: EmailTemplate; recipients: unknown[]; stats: Record<string, number> }>(`/admin/campaigns/${id}`),
  launchCampaign: (id: string) => post<{ message: string; sentCount: number; failedCount: number; totalRecipients: number }>(`/admin/campaigns/${id}/launch`, {}),
  cancelCampaign: (id: string) => post<{ message: string }>(`/admin/campaigns/${id}/cancel`, {}),
  analytics: () => get<{ byDepartment: unknown[]; byCategory: unknown[] }>('/admin/campaigns/analytics'),
};
