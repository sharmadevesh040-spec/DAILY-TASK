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
  console.log('[Storage] Cloudinary credentials not configured. In production/serverless, Cloudinary is required for photo proofs.');
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Uploads an image buffer to object storage (Cloudinary or local static fallback)
 * Never stores large base64 strings in PostgreSQL!
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  originalname: string,
  mimetype: string
): Promise<UploadResult> {
  // Validate mimetype
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
  if (!allowedMimeTypes.includes(mimetype.toLowerCase())) {
    throw new Error(`Invalid file type ${mimetype}. Allowed types: JPEG, PNG, WEBP, GIF, HEIC`);
  }

  // 10MB limit check
  const MAX_SIZE = 10 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw new Error('Image size exceeds 10MB limit');
  }

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

  // Fallback: Local storage (Only in non-serverless / local development environments)
  const isServerlessOrProd = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === 'production'
  );

  if (isServerlessOrProd) {
    throw new Error(
      'Persistent photo storage is not configured. Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) must be set in Vercel environment variables for task completion photo proofs.'
    );
  }

  // Lazily ensure local directory exists only when an actual file is uploaded in local dev
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
