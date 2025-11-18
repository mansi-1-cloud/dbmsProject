import { Router, Response, Request } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { tokenService } from '../services/tokenServices.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { createTokenSchema, updateTokenStatusSchema } from '../validators/schemas.js';
import { HttpError } from '../lib/errors.js';
import { ZodError } from 'zod';
import { upload } from '../middleware/upload.js';
import { FileUploadService } from '../services/FileUploadService.js';

const router = Router();
const handleError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: error.errors });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('Unhandled error in token.routes.ts:', error);
  return res.status(500).json({ error: 'Internal server error' });
};

router.post('/', authenticate, requireRole('USER'), upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const validData = createTokenSchema.parse(req.body);
    
    // Handle file uploads if files are present
    let uploadedFiles: any[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      try {
        const uploadResults = await FileUploadService.uploadMultipleFiles(req.files);
        uploadedFiles = req.files.map((file, index) => ({
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          url: uploadResults[index].url,
          publicId: uploadResults[index].publicId,
        }));
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload files' });
      }
    }
    
    // Merge uploaded files with params
    const tokenData = {
      ...validData,
      params: {
        ...validData.params,
        files: uploadedFiles,
      },
    };
    
    const token = await tokenService.createToken(tokenData, req.user!.id);
    res.status(201).json(token);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = await tokenService.getTokenById(req.params.id, req.user!);
    res.json(token);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/me', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await tokenService.getUserTokens(req.user!.id);
    res.json(tokens);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/:userId/pending', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    const tokens = await tokenService.getUserPendingTokens(req.params.userId);
    res.json(tokens);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/:userId/history', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    const tokens = await tokenService.getUserHistoryTokens(req.params.userId);
    res.json(tokens);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/user/:userId/stats', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    const stats = await tokenService.getUserStats(req.params.userId);
    res.json(stats);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/approve', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.approveToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/reject', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { vendorMessage } = updateTokenStatusSchema.parse(req.body);
    const updatedToken = await tokenService.rejectToken(req.params.id, req.user!.id, vendorMessage);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/complete', authenticate, requireRole('VENDOR'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.completeToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/:id/cancel', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const updatedToken = await tokenService.cancelToken(req.params.id, req.user!.id);
    res.json(updatedToken);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/:id', authenticate, requireRole('USER'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await tokenService.deleteToken(req.params.id, req.user!.id);
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

// Download file attached to a token (both user and vendor can download)
router.get('/:tokenId/files/:fileIndex', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tokenId, fileIndex } = req.params;
    const index = parseInt(fileIndex, 10);

    // Get the token
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: { user: true, vendor: true },
    });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Check permissions - user or vendor can download
    const isUser = req.user!.id === token.userId;
    const isVendor = req.user!.id === token.vendorId;

    if (!isUser && !isVendor) {
      return res.status(403).json({ error: 'Forbidden: You cannot access this token' });
    }

    // Get the file from params
    const files = (token.params as any)?.files || [];
    if (index < 0 || index >= files.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[index];
    
    if (!file.url) {
      return res.status(404).json({ error: 'File URL not available' });
    }

    // Check if it's a Cloudinary URL (production) or demo URL (development)
    const isCloudinaryUrl = file.url.includes('cloudinary.com') || file.url.includes('res.cloudinary.com');
    const isDemoUrl = file.url.includes('demo-cdn') || file.url.includes('demo_');

    if (isCloudinaryUrl) {
      // For Cloudinary URLs, redirect to them
      return res.redirect(file.url);
    } else if (isDemoUrl) {
      // For demo URLs, return a response with the file info for frontend to handle
      return res.json({ 
        downloadUrl: file.url, 
        fileName: file.name || `file_${index}`,
        isDemo: true,
        message: 'File was uploaded in demo mode. In production, this would download from Cloudinary.'
      });
    } else {
      // For any other URLs, try to redirect
      return res.redirect(file.url);
    }
  } catch (error: any) {
    handleError(error, res);
  }
});

// Error handler for multer errors (must be before export)
router.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum limit (20MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Maximum 10 files allowed' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err instanceof Error && err.message.includes('file type')) {
    return res.status(400).json({ error: 'Invalid file type. Only PDF and DOCX files are allowed.' });
  }
  next(err);
});

export default router;
