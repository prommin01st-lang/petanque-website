import type { MediaItem } from '@/lib/types';

/** Markdown image syntax with the alt text escaped so brackets/newlines cannot break it. */
export function mediaMarkdown(item: Pick<MediaItem, 'originalName' | 'url'>): string {
  const alt = item.originalName.replace(/[\r\n]+/g, ' ').replace(/[\\[\]]/g, (c) => `\\${c}`);
  return `![${alt}](${item.url})`;
}
