/**
 * All editorial imagery used by the landing page lives here so the photo set
 * can be replaced with owned assets (or Supabase Storage URLs) in one place.
 *
 * The current values are stable, public Unsplash CDN photo IDs. They are
 * rendered unoptimized because the local Android/arm64 runtime cannot load
 * the native image optimizer; the remote URLs already deliver sized files.
 */
const UNSPLASH_CDN = "https://images.unsplash.com";

function photo(id: string, width: number, height?: number): string {
  const dimensions = height ? `&h=${height}` : "";
  return `${UNSPLASH_CDN}/${id}?auto=format&fit=crop&w=${width}${dimensions}&q=80`;
}

export const landingImages = {
  heroMain: photo("photo-1500530855697-b586d89ba3ee", 900, 1120),
  heroTop: photo("photo-1507525428034-b723cf961d3e", 520, 620),
  heroBottom: photo("photo-1493246507139-91e8fad9978e", 520, 520),
  heroPanorama: photo("photo-1470770841072-f978cf4d019e", 1200, 620),
  share: photo("photo-1519681393784-d120267933ba", 900, 700),
  community: photo("photo-1441974231531-c6227db76b6e", 900, 700),
  connection: photo("photo-1493246507139-91e8fad9978e", 900, 700),
} as const;

/** Illustrative portraits. These are sample faces, not real Luma members. */
export const sampleAvatars = {
  maya: photo("photo-1494790108377-be9c29b29330", 160, 160),
  avery: photo("photo-1500648767791-00dcc994a43e", 160, 160),
  noor: photo("photo-1534528741775-53994a69daeb", 160, 160),
  leo: photo("photo-1506794778202-cad84cf45f1d", 160, 160),
} as const;
