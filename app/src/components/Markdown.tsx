import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';

const classPattern = /^(language-|hljs)/;
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', classPattern]],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', classPattern]],
  },
};

export default function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <div className={`md-term ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema], rehypeHighlight]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ node: _node, href, children, ...rest }) => {
            const external = !!href && /^https?:\/\//i.test(href);
            return (
              <a
                {...rest}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </a>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          img: ({ node: _node, ...rest }) => <img {...rest} loading="lazy" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
