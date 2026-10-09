import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import { ApiError } from '@/lib/api';
import PostEditor from './PostEditor';

const admin = vi.hoisted(() => ({
  posts: vi.fn(), getPost: vi.fn(), createPost: vi.fn(), updatePost: vi.fn(), deletePost: vi.fn(), media: vi.fn(),
}));
const upload = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, upload, api: { admin } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  admin.media.mockResolvedValue({ items: [] });
  upload.mockResolvedValue({ id: 3, url: '/uploads/abc.png' });
});

function setup(entry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/admin/posts/new" element={<PostEditor />} />
            <Route path="/admin/posts/:id" element={<PostEditor />} />
            <Route path="/admin/posts" element={<p>list</p>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

const POST = {
  id: 9, slug: 'hello', titleEn: 'Hello', titleTh: '', excerptEn: 'ex', excerptTh: '', bodyEn: 'body', bodyTh: '',
  tags: [], coverMediaId: null, coverUrl: '', status: 'draft', publishedAt: null, createdAt: '', updatedAt: '',
};

it('pasting an image uploads it and inserts markdown at the cursor', async () => {
  setup('/admin/posts/new');
  const body = await screen.findByLabelText(/body/i);
  await userEvent.type(body, 'before ');
  const file = new File(['x'], 'shot.png', { type: 'image/png' });
  fireEvent.paste(body, { clipboardData: { files: [file], items: [], types: ['Files'] } });
  await waitFor(() => expect(body).toHaveValue('before ![shot.png](/uploads/abc.png)'));
});

it('escapes brackets in the alt text and unsafe characters in the url', async () => {
  upload.mockResolvedValueOnce({ id: 4, url: '/uploads/a b(1).png' });
  setup('/admin/posts/new');
  const body = await screen.findByLabelText(/body/i);
  const file = new File(['x'], 'a]b[c.png', { type: 'image/png' });
  fireEvent.drop(body, { dataTransfer: { files: [file], items: [], types: ['Files'] } });
  await waitFor(() => expect(body).toHaveValue('![a\\]b\\[c.png](/uploads/a%20b%281%29.png)'));
});

it('preview renders the markdown live', async () => {
  setup('/admin/posts/new');
  await userEvent.type(await screen.findByLabelText(/body/i), '## Hello');
  expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument();
});

it('offers to restore an autosaved draft', async () => {
  localStorage.setItem('draft:post:new', JSON.stringify({ savedAt: Date.now(), value: { slug: 'x', titleEn: 'Recovered', titleTh: '', excerptEn: '', excerptTh: '', bodyEn: 'lost work', bodyTh: '', tags: [], coverMediaId: null, status: 'draft' } }));
  setup('/admin/posts/new');
  await userEvent.click(await screen.findByRole('button', { name: /restore/i }));
  expect(screen.getByLabelText(/body/i)).toHaveValue('lost work');
});

it('does not offer a draft identical to the loaded post', async () => {
  admin.getPost.mockResolvedValue(POST);
  const input = {
    slug: POST.slug, titleEn: POST.titleEn, titleTh: POST.titleTh, excerptEn: POST.excerptEn, excerptTh: POST.excerptTh,
    bodyEn: POST.bodyEn, bodyTh: POST.bodyTh, tags: POST.tags, coverMediaId: POST.coverMediaId, status: POST.status,
  };
  localStorage.setItem('draft:post:9', JSON.stringify({ savedAt: Date.now(), value: input }));
  setup('/admin/posts/9');
  expect(await screen.findByLabelText(/body/i)).toHaveValue('body');
  expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
});

it('tab inserts two spaces', async () => {
  setup('/admin/posts/new');
  const body = await screen.findByLabelText(/body/i);
  await userEvent.type(body, 'a');
  await userEvent.tab();
  await userEvent.type(body, 'b');
  expect(body).toHaveValue('a  b');
});

it('creates with an auto slug, clears the draft and moves to the edit url', async () => {
  admin.createPost.mockResolvedValue({ ...POST, id: 12, slug: 'my-post', titleEn: 'My Post' });
  admin.getPost.mockResolvedValue({ ...POST, id: 12, slug: 'my-post', titleEn: 'My Post' });
  setup('/admin/posts/new');
  await userEvent.type(await screen.findByLabelText(/^title/i), 'My Post');
  expect(screen.getByLabelText(/slug/i)).toHaveValue('my-post');
  await userEvent.click(screen.getByRole('button', { name: /published/i }));
  await userEvent.click(screen.getByRole('button', { name: /^\[save\]$/i }));
  await waitFor(() => expect(admin.createPost).toHaveBeenCalledTimes(1));
  expect(admin.createPost.mock.calls[0][0]).toMatchObject({ slug: 'my-post', titleEn: 'My Post', status: 'published', coverMediaId: null });
  expect(await screen.findByText('edit post')).toBeInTheDocument();
  expect(localStorage.getItem('draft:post:new')).toBeNull();
});

it('Ctrl+S saves an existing post', async () => {
  admin.getPost.mockResolvedValue(POST);
  admin.updatePost.mockResolvedValue({ ...POST, bodyEn: 'body!' });
  setup('/admin/posts/9');
  const body = await screen.findByLabelText(/body/i);
  await userEvent.type(body, '!');
  fireEvent.keyDown(window, { key: 's', ctrlKey: true });
  await waitFor(() => expect(admin.updatePost).toHaveBeenCalledWith(9, expect.objectContaining({ bodyEn: 'body!' })));
});

it('shows a translated error when the post is too large', async () => {
  admin.createPost.mockRejectedValue(new ApiError(413, 'too_large', 'request body too large'));
  setup('/admin/posts/new');
  await userEvent.type(await screen.findByLabelText(/^title/i), 'Big');
  await userEvent.click(screen.getByRole('button', { name: /^\[save\]$/i }));
  expect(await screen.findByText(/post is too large/i)).toBeInTheDocument();
});

it('switches to the language tab holding a body error', async () => {
  admin.createPost.mockRejectedValue(new ApiError(422, 'validation_failed', 'x', { bodyTh: 'thai body required' }));
  setup('/admin/posts/new');
  await userEvent.type(await screen.findByLabelText(/^title/i), 'X');
  await userEvent.click(screen.getByRole('button', { name: /^\[save\]$/i }));
  expect(await screen.findByText(/thai body required/)).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /TH/ })).toHaveAttribute('aria-selected', 'true');
});

it('maps slug_taken to the slug field', async () => {
  admin.createPost.mockRejectedValue(new ApiError(409, 'slug_taken', 'x'));
  setup('/admin/posts/new');
  await userEvent.type(await screen.findByLabelText(/^title/i), 'Dup');
  await userEvent.click(screen.getByRole('button', { name: /^\[save\]$/i }));
  expect(await screen.findByText(/slug is already in use/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/slug/i)).toHaveAttribute('aria-invalid', 'true');
});

it('hides a stale restore banner after a successful save', async () => {
  admin.getPost.mockResolvedValue(POST);
  admin.updatePost.mockResolvedValue({ ...POST, bodyEn: 'body!' });
  localStorage.setItem('draft:post:9', JSON.stringify({ savedAt: Date.now(), value: { ...POST, bodyEn: 'stale' } }));
  setup('/admin/posts/9');
  const body = await screen.findByLabelText(/body/i);
  expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
  await userEvent.type(body, '!');
  await userEvent.click(screen.getByRole('button', { name: /^\[save\]$/i }));
  await waitFor(() => expect(admin.updatePost).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument());
  expect(body).toHaveValue('body!');
});

it('tab with a selection indents the selected lines and keeps them selected', async () => {
  setup('/admin/posts/new');
  const body = (await screen.findByLabelText(/body/i)) as HTMLTextAreaElement;
  fireEvent.change(body, { target: { value: 'one\ntwo\nthree' } });
  body.setSelectionRange(1, 6); // "ne\ntw"
  fireEvent.keyDown(body, { key: 'Tab' });
  expect(body).toHaveValue('  one\n  two\nthree');
  expect([body.selectionStart, body.selectionEnd]).toEqual([3, 10]);
  expect(body.value.slice(body.selectionStart, body.selectionEnd)).toBe('ne\n  tw');
});

it('keeps text typed while a create request is in flight', async () => {
  let resolve!: (v: unknown) => void;
  admin.createPost.mockReturnValue(new Promise((r) => (resolve = r)));
  const created = { ...POST, id: 12, slug: 'p', titleEn: 'P', bodyEn: 'first' };
  admin.getPost.mockResolvedValue(created);
  setup('/admin/posts/new');
  await userEvent.type(await screen.findByLabelText(/^title/i), 'P');
  const body = screen.getByLabelText(/body/i);
  await userEvent.type(body, 'first');
  await userEvent.click(screen.getByRole('button', { name: /^\[save\]$/i }));
  await userEvent.type(body, ' second');
  resolve(created);
  expect(await screen.findByText('edit post')).toBeInTheDocument();
  await userEvent.click(await screen.findByRole('button', { name: /restore/i }));
  expect(screen.getByLabelText(/body/i)).toHaveValue('first second');
});

it('does not swallow a paste that carries text alongside an image', async () => {
  setup('/admin/posts/new');
  const body = await screen.findByLabelText(/body/i);
  const file = new File(['x'], 'shot.png', { type: 'image/png' });
  const ev = fireEvent.paste(body, { clipboardData: { files: [file], items: [], types: ['text/plain', 'Files'], getData: () => 'hi' } });
  expect(ev).toBe(true); // default not prevented
  expect(upload).not.toHaveBeenCalled();
});

it('shows when the post was published', async () => {
  admin.getPost.mockResolvedValue({ ...POST, status: 'published', publishedAt: '2026-10-01T08:00:00.000Z' });
  setup('/admin/posts/9');
  expect(await screen.findByText(/published: .*2026/i)).toBeInTheDocument();
});

it('says never published for an unpublished post', async () => {
  admin.getPost.mockResolvedValue(POST);
  setup('/admin/posts/9');
  expect(await screen.findByText(/never published/i)).toBeInTheDocument();
});
