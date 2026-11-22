export interface PhotoListing { owner_id: string; photos: string[]; status: string }

/** Never sign an arbitrary path, even if an approved listing references it. */
export function approvedPhotoPaths(paths: string[], listings: PhotoListing[]): string[] {
  return [...new Set(paths)].filter((path) => {
    if (path.startsWith("/") || path.split("/").some((part) => part === "." || part === "..")) return false;
    return listings.some((listing) => listing.status === "approved"
      && path.startsWith(`${listing.owner_id}/`) && listing.photos.includes(path));
  });
}