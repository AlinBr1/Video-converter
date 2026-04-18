export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export const UPLOAD_CONFIG = {
  maxSizeBytes: 500 * 1024 * 1024, // 500MB
  maxSizeMB: 500,
  allowedExtensions: ['mp4', 'mov', 'avi', 'mkv'],
  allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
} as const;
