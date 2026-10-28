import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Check if Cloudinary credentials are provided
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

if (isCloudinaryConfigured()) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    console.log('[Storage] Cloudinary initialized for persistent object storage');
  } catch (err) {
    console.error('[Storage] Error configuring Cloudinary:', err);
  }
} else {
  console.log('[Storage] Cloudinary credentials not configured. Resilient data URI / local fallback active.');
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Validates whether the incoming upload is a supported image
 */
export function isSupportedImage(mimetype: string, originalname: string): boolean {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/pjpeg',
    'image/x-png',
    'application/octet-stream',
  ];

  const ext = path.extname(originalname || '').toLowerCase();
  const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];

  return allowedMimeTypes.includes((mimetype || '').toLowerCase()) || validExts.includes(ext);
}

/**
 * Uploads an image buffer to object storage (Cloudinary, local static directory, or resilient data URI)
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  originalname: string,
  mimetype: string
): Promise<UploadResult> {
  // Validate file
  if (!isSupportedImage(mimetype, originalname)) {
    throw new Error(`Invalid file type ${mimetype || 'unknown'}. Allowed types: JPEG, PNG, WEBP, GIF, HEIC`);
  }

  // 10MB limit check
  const MAX_SIZE = 10 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw new Error('Image size exceeds 10MB limit. Please choose a smaller photo.');
  }

  // Normalize safe MIME type
  let safeMime = mimetype;
  if (!safeMime || safeMime === 'application/octet-stream') {
    const ext = path.extname(originalname || '').toLowerCase();
    if (ext === '.png') safeMime = 'image/png';
    else if (ext === '.webp') safeMime = 'image/webp';
    else if (ext === '.gif') safeMime = 'image/gif';
    else safeMime = 'image/jpeg';
  }

  // 1. Production Persistent Storage: Cloudinary
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'daily-task-proofs',
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve({
            url: result.secure_url,
            key: result.public_id,
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  // 2. Serverless / Vercel fallback when Cloudinary is not configured yet
  const isServerlessOrProd = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === 'production'
  );

  if (isServerlessOrProd) {
    // Return high-efficiency inline Data URI so proof works immediately without crashing
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${safeMime};base64,${base64Data}`;
    const fileKey = `data-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    return {
      url: dataUrl,
      key: fileKey,
    };
  }

  // 3. Local Development Fallback: write to uploads/ directory
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (dirErr: any) {
    console.error('[Storage] Failed to create local uploads directory:', dirErr);
    throw new Error('Local uploads directory cannot be created on this filesystem.');
  }

  const ext = path.extname(originalname) || '.jpg';
  const fileKey = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileKey);

  await fs.promises.writeFile(filePath, buffer);

  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  const fileUrl = `${serverUrl}/uploads/${fileKey}`;

  return {
    url: fileUrl,
    key: fileKey,
  };
}

/**
 * Deletes an image from storage
 */
export async function deleteImage(key: string): Promise<void> {
  try {
    if (!key || key.startsWith('data-') || key.startsWith('data:')) {
      return;
    }

    if (isCloudinaryConfigured() && !key.includes('/uploads/')) {
      await cloudinary.uploader.destroy(key);
      return;
    }

    if (fs.existsSync(UPLOADS_DIR)) {
      const filePath = path.join(UPLOADS_DIR, path.basename(key));
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  } catch (err) {
    console.error('[Storage] Error deleting image:', err);
  }
}
