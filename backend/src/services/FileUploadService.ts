import cloudinary from '../lib/cloudinary.js';
import { Readable } from 'stream';

interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

export class FileUploadService {
  private static isCloudinaryConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Upload a file to Cloudinary or use demo mode
   * @param file - Multer file object
   * @param folder - Cloudinary folder to store the file
   * @returns Upload result with URL and metadata
   */
  static async uploadFile(file: Express.Multer.File, folder: string = 'token-attachments'): Promise<UploadResult> {
    // Check if Cloudinary is configured
    if (!this.isCloudinaryConfigured()) {
      console.warn('⚠️  Cloudinary not configured. Using demo mode for file upload.');
      return this.demoUpload(file, folder);
    }

    return new Promise((resolve, reject) => {
      // Get file extension
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
      
      // Create a readable stream from the buffer
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw', // Use 'raw' for documents (PDF, DOCX, etc.)
          public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, '')}`, // Custom filename without extension
          use_filename: false, // We're providing our own public_id
          unique_filename: false,
          overwrite: false,
          // Add flags for proper content-disposition
          flags: 'attachment', // Forces download instead of display in browser
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: fileExtension,
              bytes: result.bytes,
            });
          } else {
            reject(new Error('Upload failed - no result returned'));
          }
        }
      );

      // Convert buffer to stream and pipe to Cloudinary
      const bufferStream = Readable.from(file.buffer);
      bufferStream.pipe(stream);
    });
  }

  /**
   * Demo upload when Cloudinary is not configured
   * Generates a mock URL for development/testing
   */
  private static demoUpload(file: Express.Multer.File, folder: string): UploadResult {
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
    const publicId = `demo_${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, '')}`;
    
    console.log(`📁 [DEMO MODE] File "${file.originalname}" would be uploaded to folder: ${folder}`);
    
    return {
      url: `https://demo-cdn.example.com/${folder}/${publicId}.${fileExtension}`,
      publicId: publicId,
      format: fileExtension,
      bytes: file.size,
    };
  }

  /**
   * Upload multiple files to Cloudinary or demo mode
   * @param files - Array of Multer file objects
   * @param folder - Cloudinary folder to store the files
   * @returns Array of upload results
   */
  static async uploadMultipleFiles(files: Express.Multer.File[], folder: string = 'token-attachments'): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Cloudinary or demo mode
   * @param publicId - Cloudinary public ID of the file
   */
  static async deleteFile(publicId: string): Promise<void> {
    // Demo mode - just log
    if (publicId.startsWith('demo_')) {
      console.log(`📁 [DEMO MODE] File "${publicId}" would be deleted from Cloudinary`);
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files from Cloudinary or demo mode
   * @param publicIds - Array of Cloudinary public IDs
   */
  static async deleteMultipleFiles(publicIds: string[]): Promise<void> {
    const deletePromises = publicIds.map(id => this.deleteFile(id));
    await Promise.all(deletePromises);
  }
}
