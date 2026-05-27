import { listingImageCompressionDefaults } from "@rentorbit/shared";

export type ProcessedListingImage = {
  id: string;
  fileName: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  mimeType: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
};

export type ListingImageCropFocus = {
  x: number;
  y: number;
};

type CropRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

const outputMimeTypes = ["image/webp", "image/jpeg"] as const;
const compressionQualities = [0.76, 0.68, 0.6] as const;
const centerCropFocus: ListingImageCropFocus = { x: 0.5, y: 0.5 };

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function coverCropRect(sourceWidth: number, sourceHeight: number, focus: ListingImageCropFocus): CropRect {
  const targetRatio = listingImageCompressionDefaults.width / listingImageCompressionDefaults.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const focusX = clampUnit(focus.x);
  const focusY = clampUnit(focus.y);

  if (sourceRatio > targetRatio) {
    const cropWidth = sourceHeight * targetRatio;
    const maxX = sourceWidth - cropWidth;
    return {
      sx: Math.min(maxX, Math.max(0, focusX * sourceWidth - cropWidth / 2)),
      sy: 0,
      sw: cropWidth,
      sh: sourceHeight
    };
  }

  const cropHeight = sourceWidth / targetRatio;
  const maxY = sourceHeight - cropHeight;
  return {
    sx: 0,
    sy: Math.min(maxY, Math.max(0, focusY * sourceHeight - cropHeight / 2)),
    sw: sourceWidth,
    sh: cropHeight
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}`));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

async function compressedCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const candidates: Blob[] = [];

  for (const mimeType of outputMimeTypes) {
    for (const quality of compressionQualities) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      if (blob) {
        candidates.push(blob);
      }
    }
  }

  const smallest = candidates.sort((left, right) => left.size - right.size)[0];
  if (!smallest) {
    throw new Error("Browser could not compress this image");
  }

  return smallest;
}

export async function processListingImageFile(
  file: File,
  cropFocus: ListingImageCropFocus = centerCropFocus
): Promise<ProcessedListingImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image`);
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Browser canvas is unavailable");
  }

  canvas.width = listingImageCompressionDefaults.width;
  canvas.height = listingImageCompressionDefaults.height;

  const crop = coverCropRect(image.naturalWidth, image.naturalHeight, cropFocus);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await compressedCanvasBlob(canvas);
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^/.]+$/, "") || "listing-image";
  const fileName = `${baseName}-5x7.${extension}`;
  const processedFile = new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now()
  });

  return {
    id: `${file.name}-${file.lastModified}-${file.size}-${blob.size}`,
    fileName,
    file: processedFile,
    previewUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    mimeType: blob.type,
    originalSizeBytes: file.size,
    compressedSizeBytes: blob.size
  };
}

export function processListingImageFiles(
  files: FileList | File[],
  cropFocus: ListingImageCropFocus = centerCropFocus
): Promise<ProcessedListingImage[]> {
  return Promise.all(Array.from(files).map((file) => processListingImageFile(file, cropFocus)));
}

export function formatImageBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(2)} MB`;
}
