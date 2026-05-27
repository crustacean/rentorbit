export const listingImageAspectRatio = {
  width: 5,
  height: 7
} as const;

export const listingImageCompressionDefaults = {
  width: 1000,
  height: 1400,
  quality: 72
} as const;

export function normalizeListingImageUrl(url: string): string {
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
  parsedUrl.searchParams.set("w", String(listingImageCompressionDefaults.width));
  parsedUrl.searchParams.set("h", String(listingImageCompressionDefaults.height));
  parsedUrl.searchParams.set("q", String(listingImageCompressionDefaults.quality));

  return parsedUrl.toString();
}
