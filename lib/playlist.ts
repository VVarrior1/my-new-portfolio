// The site's background playlist. Every track is by HoliznaCC0 and dedicated to the
// public domain (CC0), from https://opengameart.org/content/chill-beats-collection and its
// sister "Happy Lo-Fi" and "Sad Lo-Fi" packs. The files in public/music were loudness-matched
// to -16 LUFS with a -1.5 dBTP peak ceiling, so no track jumps in volume or clips.

export type Track = {
  title: string;
  artist: string;
  src: string;
  /** Seconds, so the list can show lengths before anything has loaded. */
  duration: number;
};

const artist = "HoliznaCC0";

export const PLAYLIST_NAME = "Late-night build";
export const PLAYLIST_CREDIT = "Music by HoliznaCC0, public domain (CC0)";
export const PLAYLIST_SOURCE = "https://holiznacc0.bandcamp.com";

export const playlist: Track[] = [
  { title: "City in the Rearview", artist, src: "/music/01-city-in-the-rearview.mp3", duration: 175 },
  { title: "Old Age", artist, src: "/music/02-old-age.mp3", duration: 213 },
  { title: "Blue Skies", artist, src: "/music/03-blue-skies.mp3", duration: 175 },
  { title: "Winter Blues", artist, src: "/music/04-winter-blues.mp3", duration: 223 },
  { title: "Clouds", artist, src: "/music/05-clouds.mp3", duration: 229 },
  { title: "Dream Pop", artist, src: "/music/06-dream-pop.mp3", duration: 241 },
  { title: "Opinions", artist, src: "/music/07-opinions.mp3", duration: 167 },
  { title: "Autumn", artist, src: "/music/08-autumn.mp3", duration: 169 },
  { title: "Yesterday", artist, src: "/music/09-yesterday.mp3", duration: 150 },
  { title: "Fire Place", artist, src: "/music/10-fire-place.mp3", duration: 170 },
];

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Index of the next track, wrapping at the end. */
export function nextIndex(index: number, length: number): number {
  return length === 0 ? 0 : (index + 1) % length;
}

/** Previous track, or restart the current one if it's more than 3 s in (like every music app). */
export function previousTarget(index: number, length: number, position: number): { index: number; restart: boolean } {
  if (position > 3 || length === 0) return { index, restart: true };
  return { index: (index - 1 + length) % length, restart: false };
}
