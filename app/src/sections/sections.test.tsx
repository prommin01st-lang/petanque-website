import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as apiModule from '@/lib/api';
import type { PostSummary, Project } from '@/lib/types';
import { I18nProvider } from '@/i18n/I18nContext';
import { translations } from '@/i18n/translations';
import Navbar from '@/components/Navbar';
import HomePage from '@/pages/HomePage';
import ShellProvider from '@/shell/ShellProvider';

const projects: Project[] = [
  {
    slug: 'kanban',
    name: { en: 'Kanban Board', th: 'บอร์ดคันบัน' },
    description: { en: 'Real-time task board.', th: 'บอร์ดงานแบบเรียลไทม์' },
    tags: ['react', 'signalr'],
    metric: '-50% overhead',
    repoUrl: 'https://github.com/prommin01st-lang/kanban',
    demoUrl: '',
    flagship: true,
  },
  {
    slug: 'queue-backend',
    name: { en: 'Queue Backend', th: '' },
    description: { en: 'Queue service.', th: '' },
    tags: ['go'],
    metric: '',
    repoUrl: '',
    demoUrl: '',
    flagship: false,
  },
];

const post = (n: number): PostSummary => ({
  slug: `post-${n}`,
  title: { en: `Post ${n}`, th: '' },
  excerpt: { en: '', th: '' },
  tags: [],
  coverUrl: '',
  publishedAt: '2026-10-0' + n + 'T00:00:00.000Z',
});

function renderHome(posts: PostSummary[] = []) {
  vi.spyOn(apiModule.api, 'projects').mockResolvedValue({ items: projects });
  const postsSpy = vi.spyOn(apiModule.api, 'posts').mockResolvedValue({ items: posts, page: 1, perPage: 3, total: posts.length });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/']}>
          <ShellProvider>
            <Navbar />
            <HomePage />
          </ShellProvider>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { postsSpy };
}

describe('terminal home page', () => {
  it('renders the terminal sections with API projects', async () => {
    const { postsSpy } = renderHome();

    expect(screen.getByRole('heading', { level: 1, name: 'Prommin Chandet' })).toBeInTheDocument();
    expect(screen.getByText('whoami')).toBeInTheDocument();
    expect(screen.getByText('~/about/README.md')).toBeInTheDocument();
    expect(screen.getByText('~/skills')).toBeInTheDocument();
    expect(screen.getByText('~/about/quick_facts.yaml')).toBeInTheDocument();
    expect(screen.getByText('~/profile.png')).toBeInTheDocument();

    // project boxes are titled with their slug path (desktop carousel + mobile stack)
    expect((await screen.findAllByText('~/projects/kanban')).length).toBeGreaterThan(0);
    const source = screen.getAllByRole('link', { name: '[ source ↗ ]' });
    expect(source[0]).toHaveAttribute('href', projects[0].repoUrl);
    // a project without repoUrl gets no source link: 2 renders × 1 linked project
    expect(source).toHaveLength(2);
    expect(screen.getAllByText('[★ flagship]').length).toBeGreaterThan(0);

    // no posts → latest-posts box is absent (once the posts query has resolved)
    await waitFor(() => expect(postsSpy).toHaveBeenCalled());
    await act(async () => {
      await postsSpy.mock.results[0].value;
    });
    expect(screen.queryByText('~/blog')).not.toBeInTheDocument();
  });

  it('renders the latest-posts box when posts exist', async () => {
    renderHome([post(1), post(2), post(3)]);
    expect(await screen.findByText('~/blog')).toBeInTheDocument();
    for (const n of [1, 2, 3]) {
      expect(screen.getByRole('link', { name: new RegExp(`Post ${n}`) })).toHaveAttribute('href', `/blog/post-${n}`);
    }
  });

  it('switches About copy to Thai via the navbar toggle', async () => {
    const user = userEvent.setup();
    renderHome();
    expect(screen.getByText(translations.en.about.bio1)).toBeInTheDocument();

    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getAllByRole('button', { name: 'TH' })[0]);

    expect(screen.getByText(translations.th.about.bio1)).toBeInTheDocument();
    expect(screen.queryByText(translations.en.about.bio1)).not.toBeInTheDocument();
  });
});

describe('hero shell hint', () => {
  const stubPointer = (coarse: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: coarse && q.includes('pointer: coarse'), media: q, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
    }));
  afterEach(() => vi.unstubAllGlobals());

  it('shows the ` shortcut as <kbd> on fine pointers', () => {
    stubPointer(false);
    renderHome();
    const hint = screen.getByTestId('shell-hint');
    expect(hint).toHaveTextContent('press ` to open a shell');
    expect(hint.querySelector('kbd')).toHaveTextContent('`');
  });

  it('shows the tap hint on coarse pointers', () => {
    stubPointer(true);
    renderHome();
    const hint = screen.getByTestId('shell-hint');
    expect(hint).toHaveTextContent('tap >_ shell to open a shell');
    expect(hint.querySelector('kbd')).toBeNull();
  });
});
