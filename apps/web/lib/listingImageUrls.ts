export function listingThumbnailUrl(url: string, width: number, height: number): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return url;
  }

  if (!parsedUrl.hostname.includes("images.unsplash.com")) {
    return url;
  }

  parsedUrl.searchParams.set("auto", "format");
  parsedUrl.searchParams.set("fit", "crop");
  parsedUrl.searchParams.set("w", String(width));
  parsedUrl.searchParams.set("h", String(height));
  parsedUrl.searchParams.set("q", "58");

  return parsedUrl.toString();
}
