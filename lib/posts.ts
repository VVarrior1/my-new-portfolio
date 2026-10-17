import type { BlogMetadata } from "./blogs";
import { excerpt } from "./text";

export type HomePost = BlogMetadata & { teaser: string };

/**
 * The posts shown on the home page: the pinned slugs first (in that order of preference), then
 * the newest of the rest, skipping any post whose excerpt leaves nothing to show. The result is
 * sorted newest first, so the list still reads as a timeline.
 */
export function pickHomePosts(posts: BlogMetadata[], pinned: string[], count: number, teaserLength = 150): HomePost[] {
  const withTeaser = posts
    .map((post) => ({ ...post, teaser: excerpt(post.excerpt, post.title, teaserLength) }))
    .filter((post) => post.teaser);
  const first = pinned.flatMap((slug) => withTeaser.filter((post) => post.slug === slug));
  const rest = withTeaser.filter((post) => !pinned.includes(post.slug)).sort((a, b) => b.date.localeCompare(a.date));
  return [...first, ...rest].slice(0, count).sort((a, b) => b.date.localeCompare(a.date));
}
