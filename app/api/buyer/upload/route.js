import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize DigitalOcean Spaces client (S3-compatible)
const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
  region: process.env.DO_SPACES_REGION || 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'ableman-llc';

// Helper function to validate file type
function isAllowedFileType(mimeType) {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  return allowedTypes.includes(mimeType);
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File size exceeds 10MB limit'
      }, { status: 400 });
    }

    // Validate file type
    if (!isAllowedFileType(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'File type not allowed'
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `chat/${timestamp}_${random}_${sanitizedName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to DigitalOcean Spaces
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ACL: 'public-read',
      ContentType: file.type,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate public URL
    const publicUrl = `https://${BUCKET_NAME}.${process.env.DO_SPACES_REGION || 'nyc3'}.digitaloceanspaces.com/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload file'
    }, { status: 500 });
  }
}
