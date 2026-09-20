export type PhotoDTO = {
  id: number;
  originalName: string;
  originalFile: string;
  upscaledFile: string;
  thumbFile: string;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  originalBytes: number;
  upscaledBytes: number;
  createdAt: string;
  originalUrl: string;
  upscaledUrl: string;
  thumbUrl: string;
};

export type QueueItem = {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  status: "queued" | "working" | "done" | "error";
  error?: string;
  photo?: PhotoDTO;
};
