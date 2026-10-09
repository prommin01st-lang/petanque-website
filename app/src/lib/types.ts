export interface Localized { en: string; th: string }
export interface Project { slug: string; name: Localized; description: Localized; tags: string[]; metric: string; repoUrl: string; demoUrl: string; flagship: boolean }
export interface PostSummary { slug: string; title: Localized; excerpt: Localized; tags: string[]; coverUrl: string; publishedAt: string }
export interface Post extends PostSummary { body: Localized }
export interface Paged<T> { items: T[]; page: number; perPage: number; total: number }
export interface Me { username: string; githubLogin: string | null; totpEnabled: boolean; authMethod: 'password' | 'github'; csrfToken: string }
export interface AdminProject { id: number; slug: string; nameEn: string; nameTh: string; descEn: string; descTh: string; tags: string[]; metric: string; repoUrl: string; demoUrl: string; flagship: boolean; published: boolean; sortOrder: number; createdAt: string; updatedAt: string }
export type ProjectInput = Omit<AdminProject, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt'>
export type PostStatus = 'draft' | 'published'
export interface AdminPost { id: number; slug: string; titleEn: string; titleTh: string; excerptEn: string; excerptTh: string; bodyEn: string; bodyTh: string; tags: string[]; coverMediaId: number | null; coverUrl: string; status: PostStatus; publishedAt: string | null; createdAt: string; updatedAt: string }
export type PostInput = Omit<AdminPost, 'id' | 'coverUrl' | 'publishedAt' | 'createdAt' | 'updatedAt'>
export interface MediaItem { id: number; url: string; filename: string; originalName: string; mime: string; size: number; width: number; height: number; createdAt: string }
export interface SessionInfo { id: string; ip: string; userAgent: string; authMethod: string; createdAt: string; expiresAt: string; current: boolean }
export interface AuditEntry { id: number; action: string; entity: string; entityId: string; ip: string; createdAt: string }
export type LoginNext = 'totp' | 'totp_setup'
