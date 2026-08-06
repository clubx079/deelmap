import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToB2, isB2Configured } from '@/lib/b2-storage';

// Server-side listing-photo upload → private Backblaze B2 bucket.
// Replaces the old client-side upload to AiroBase Storage so deelmap-originated
// listing images live on B2 alongside every scraped photo, served via /api/img.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 20 * 1024 * 1024; // 20MB (client already compresses)
const MAX_WIDTH = 2400;

export async function POST(request) {
  try {
    if (!isB2Configured()) {
      return NextResponse.json({ success: false, error: 'Image storage not configured' }, { status: 500 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const userId = String(form.get('userId') || 'anon').replace(/[^a-zA-Z0-9_-]/g, '') || 'anon';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'File type not allowed' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'File exceeds 20MB limit' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Normalize to high-quality webp (matches the scraper image pipeline).
    let outBuffer, contentType, ext;
    try {
      const img = sharp(inputBuffer).rotate();
      const meta = await img.metadata();
      const pipeline = meta.width && meta.width > MAX_WIDTH
        ? img.resize({ width: MAX_WIDTH, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
        : img;
      outBuffer = await pipeline.webp({ quality: 95, effort: 6, smartSubsample: true }).toBuffer();
      contentType = 'image/webp';
      ext = 'webp';
    } catch {
      // If sharp can't decode it, store the original bytes as-is.
      outBuffer = inputBuffer;
      contentType = file.type;
      ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    }

    const key = `manual/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const url = await uploadToB2(outBuffer, key, contentType);

    return NextResponse.json({ success: true, url, key });
  } catch (error) {
    console.error('[upload-listing-image] error:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
