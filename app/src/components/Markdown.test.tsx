import { render, screen } from '@testing-library/react';
import Markdown from './Markdown';

describe('Markdown', () => {
  it('renders GFM tables and highlighted code', () => {
    const { container } = render(<Markdown source={'| a | b |\n|---|---|\n| 1 | 2 |\n\n```go\nfunc main() {}\n```'} />);
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('code.hljs, code[class*="language-go"]')).toBeInTheDocument();
  });

  it('strips scripts, event handlers and javascript: links', () => {
    const { container } = render(
      <Markdown source={'<script>window.pwned=1</script>\n\n<img src=x onerror="window.pwned=1">\n\n[click](javascript:alert(1))'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(screen.getByText('click').getAttribute('href') ?? '').not.toContain('javascript:');
  });

  it('opens external links safely', () => {
    render(<Markdown source={'[site](https://example.com)'} />);
    const a = screen.getByText('site');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
