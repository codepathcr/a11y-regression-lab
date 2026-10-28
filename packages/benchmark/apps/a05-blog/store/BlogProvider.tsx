import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BlogContext, PAGE_SIZE, POSTS } from './blog-context';
import type { BlogState } from './blog-context';

export function BlogProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [announcement, setAnnouncement] = useState('');

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return POSTS;
    return POSTS.filter(
      (post) =>
        post.title.toLowerCase().includes(needle) ||
        post.summary.toLowerCase().includes(needle) ||
        post.tag.toLowerCase().includes(needle)
    );
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageItems = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const value = useMemo<BlogState>(
    () => ({
      query,
      setQuery: (next: string) => {
        setQuery(next);
        setPage(1);
      },
      page: current,
      setPage: (next: number) => {
        setPage(next);
        setAnnouncement(`Página ${next} de ${pageCount}.`);
      },
      matches,
      pageItems,
      pageCount,
      announcement,
    }),
    [query, current, matches, pageItems, pageCount, announcement]
  );

  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
}
