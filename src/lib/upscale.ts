import sharp from "sharp";

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_EDGE = 7680;

export type UpscaleResult = {
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  upscaledBuffer: Buffer;
  thumbBuffer: Buffer;
};

function targetSize(width: number, height: number) {
  // 1080p-class frames become true UHD 4K. Everything else gets a clean 2x super-res.
  const isLandscapeHd =
    width >= 1280 &&
    width <= 2048 &&
    height >= 720 &&
    height <= 1440 &&
    width >= height;
  const isPortraitHd =
    height >= 1280 &&
    height <= 2048 &&
    width >= 720 &&
    width <= 1440 &&
    height >= width;

  let targetWidth = width * 2;
  let targetHeight = height * 2;

  if (isLandscapeHd && Math.abs(width / height - 16 / 9) < 0.18) {
    targetWidth = 3840;
    targetHeight = 2160;
  } else if (isPortraitHd && Math.abs(height / width - 16 / 9) < 0.18) {
    targetWidth = 2160;
    targetHeight = 3840;
  }

  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(targetWidth, targetHeight));
  return {
    width: Math.max(2, Math.round(targetWidth * scale)),
    height: Math.max(2, Math.round(targetHeight * scale)),
  };
}

export async function upscaleTo4kHdr(input: Buffer): Promise<UpscaleResult> {
  const oriented = await sharp(input, {
    failOn: "none",
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .toBuffer();

  const meta = await sharp(oriented, { failOn: "none" }).metadata();
  const originalWidth = meta.width ?? 0;
  const originalHeight = meta.height ?? 0;

  if (!originalWidth || !originalHeight) {
    throw new Error("Could not read image dimensions");
  }

  const { width: upscaledWidth, height: upscaledHeight } = targetSize(originalWidth, originalHeight);

  const pipeline = sharp(oriented, { failOn: "none" }).resize(upscaledWidth, upscaledHeight, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  });

  // HDR-style grade: local contrast, lifted midtones, richer color, fine detail.
  try {
    pipeline.clahe({ width: 64, height: 64, maxSlope: 2.4 });
  } catch {
    // CLAHE is unavailable on some libvips builds; continue with the rest of the grade.
  }

  const upscaledBuffer = await pipeline
    .modulate({ brightness: 1.05, saturation: 1.24 })
    .gamma(1.12)
    .sharpen({ sigma: 1.15, m1: 1, m2: 0.45 })
    .jpeg({
      quality: 95,
      chromaSubsampling: "4:4:4",
      mozjpeg: true,
    })
    .toBuffer();

  const thumbBuffer = await sharp(upscaledBuffer)
    .resize(960, 640, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return {
    originalWidth,
    originalHeight,
    upscaledWidth,
    upscaledHeight,
    upscaledBuffer,
    thumbBuffer,
  };
}
