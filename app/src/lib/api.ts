import type {
  AdminPost, AdminProject, AuditEntry, LoginNext, MediaItem, Me, Paged, Post, PostInput,
  PostStatus, PostSummary, Project, ProjectInput, SessionInfo,
} from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;
  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let csrf: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrf = token;
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network', 'Network error');
  }
  if (res.status === 204) return undefined as T;
  let text: string;
  try {
    text = await res.text();
  } catch {
    throw new ApiError(0, 'network', 'Network error');
  }
  let data: unknown;
  let parsed = true;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      parsed = false;
    }
  }
  if (!res.ok) {
    const env = (data as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | undefined)?.error;
    throw new ApiError(res.status, env?.code ?? `http_${res.status}`, env?.message ?? res.statusText ?? 'Request failed', env?.fields);
  }
  if (!parsed) throw new ApiError(res.status, 'bad_response', 'Unexpected response from server');
  return data as T;
}

export async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const headers = new Headers();
  if (method !== 'GET' && csrf) headers.set('X-CSRF-Token', csrf);
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }
  return send<T>(path, init);
}

export async function upload(file: File): Promise<MediaItem> {
  const form = new FormData();
  form.append('file', file);
  const headers = new Headers();
  if (csrf) headers.set('X-CSRF-Token', csrf);
  return send<MediaItem>('/api/admin/media', { method: 'POST', headers, body: form });
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  projects: () => request<{ items: Project[] }>('GET', '/api/projects'),
  posts: (params: { page?: number; perPage?: number; tag?: string } = {}) =>
    request<Paged<PostSummary>>('GET', `/api/posts${qs(params)}`),
  post: (slug: string) => request<Post>('GET', `/api/posts/${encodeURIComponent(slug)}`),
  auth: {
    providers: () => request<{ github: boolean }>('GET', '/api/auth/providers'),
    login: (username: string, password: string) =>
      request<{ next: LoginNext }>('POST', '/api/auth/login', { username, password }),
    totpSetup: () => request<{ secret: string; otpauthUrl: string }>('POST', '/api/auth/totp/setup'),
    totpVerify: (code: string) => request<{ recoveryCodes?: string[] }>('POST', '/api/auth/totp/verify', { code }),
    recovery: (code: string) => request<Record<string, never>>('POST', '/api/auth/recovery', { code }),
    me: () => request<Me>('GET', '/api/auth/me'),
    logout: () => request<void>('POST', '/api/auth/logout'),
    logoutAll: () => request<void>('POST', '/api/auth/logout-all'),
    sessions: () => request<{ items: SessionInfo[] }>('GET', '/api/auth/sessions'),
    revokeSession: (id: string) => request<void>('DELETE', `/api/auth/sessions/${encodeURIComponent(id)}`),
    regenerateRecovery: (code: string) =>
      request<{ recoveryCodes: string[] }>('POST', '/api/auth/recovery-codes/regenerate', { code }),
    linkGitHub: (code: string) => request<{ url: string }>('POST', '/api/auth/github/link', { code }),
    unlinkGitHub: (code: string) => request<void>('POST', '/api/auth/github/unlink', { code }),
  },
  admin: {
    projects: () => request<{ items: AdminProject[] }>('GET', '/api/admin/projects'),
    createProject: (p: ProjectInput) => request<AdminProject>('POST', '/api/admin/projects', p),
    updateProject: (id: number, p: ProjectInput) => request<AdminProject>('PUT', `/api/admin/projects/${id}`, p),
    deleteProject: (id: number) => request<void>('DELETE', `/api/admin/projects/${id}`),
    reorderProjects: (ids: number[]) => request<void>('PUT', '/api/admin/projects/order', { ids }),
    posts: (status?: PostStatus) => request<{ items: AdminPost[] }>('GET', `/api/admin/posts${qs({ status })}`),
    getPost: (id: number) => request<AdminPost>('GET', `/api/admin/posts/${id}`),
    createPost: (p: PostInput) => request<AdminPost>('POST', '/api/admin/posts', p),
    updatePost: (id: number, p: PostInput) => request<AdminPost>('PUT', `/api/admin/posts/${id}`, p),
    deletePost: (id: number) => request<void>('DELETE', `/api/admin/posts/${id}`),
    media: () => request<{ items: MediaItem[] }>('GET', '/api/admin/media'),
    deleteMedia: (id: number) => request<void>('DELETE', `/api/admin/media/${id}`),
    audit: (page = 1) => request<Paged<AuditEntry>>('GET', `/api/admin/audit${qs({ page })}`),
  },
};
