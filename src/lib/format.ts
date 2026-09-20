export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMegapixels(width: number, height: number) {
  return `${((width * height) / 1_000_000).toFixed(1)} MP`;
}

export function formatResolution(width: number, height: number) {
  return `${width.toLocaleString()} × ${height.toLocaleString()}`;
}

export function labelForFrame(width: number, height: number) {
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  if (longEdge >= 3800 && shortEdge >= 2100) return "4K UHD";
  if (longEdge >= 2500) return "2.5K+";
  if (longEdge >= 1800) return "1080p HD";
  if (longEdge >= 1200) return "720p";
  return "SD";
}
