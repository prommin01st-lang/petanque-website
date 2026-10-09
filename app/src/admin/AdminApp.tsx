import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingBar } from '@/components/term';
import { useI18n } from '@/i18n/I18nContext';
import AuthGate from './AuthGate';
import AdminLayout from './AdminLayout';
import LoginPage from './login/LoginPage';

const ProjectsPage = lazy(() => import('./projects/ProjectsPage'));
const ProjectEditor = lazy(() => import('./projects/ProjectEditor'));
const PostsPage = lazy(() => import('./posts/PostsPage'));
const PostEditor = lazy(() => import('./posts/PostEditor'));
const MediaPage = lazy(() => import('./media/MediaPage'));
const SettingsPage = lazy(() => import('./settings/SettingsPage'));
const AuditPage = lazy(() => import('./audit/AuditPage'));

export default function AdminApp() {
  const { t } = useI18n();
  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      <Suspense fallback={<div className="p-6"><LoadingBar label={t.common.loading} /></div>}>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<AuthGate />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="projects" replace />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/new" element={<ProjectEditor />} />
              <Route path="projects/:id" element={<ProjectEditor />} />
              <Route path="posts" element={<PostsPage />} />
              <Route path="posts/new" element={<PostEditor />} />
              <Route path="posts/:id" element={<PostEditor />} />
              <Route path="media" element={<MediaPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="*" element={<Navigate to="/admin/projects" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
