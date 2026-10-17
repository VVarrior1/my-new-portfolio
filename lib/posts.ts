import type { BlogMetadata } from "./blogs";
import { excerpt } from "./text";

export type HomePost = BlogMetadata & { teaser: string };

/**
 * The posts shown on the home page: the pinned slugs that exist, in their order of preference,
 * up to `count`, skipping any post whose excerpt leaves nothing to show. Unpinned posts never top
 * the list up (they are the off-topic ones), unless no pinned post exists at all, so the section is
 * never empty. The result is sorted newest first, so the list still reads as a timeline.
 */
export function pickHomePosts(posts: BlogMetadata[], pinned: string[], count: number, teaserLength = 92): HomePost[] {
  const withTeaser = posts
    .map((post) => ({ ...post, teaser: excerpt(post.excerpt, post.title, teaserLength) }))
    .filter((post) => post.teaser);
  const picked = pinned.flatMap((slug) => withTeaser.filter((post) => post.slug === slug)).slice(0, count);
  const shown = picked.length > 0 ? picked : [...withTeaser].sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
  return shown.sort((a, b) => b.date.localeCompare(a.date));
}
