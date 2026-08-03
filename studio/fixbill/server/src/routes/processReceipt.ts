import { type NextFunction, type Request, type Response, Router } from 'express';
// @ts-ignore
import multer from 'multer';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { syncSavedReceiptOutput } from '../services/googleDriveService.js';
import { processReceiptPdf } from '../services/pdfReceiptService.js';
import { generateReceiptJobId, loadReceiptOutput, saveReceiptOutput, toSafeDirName } from '../services/outputService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

// ... rest of file (I need to find the request.file usage)


const processBodySchema = z.object({
  newAddress: z.string().trim().min(1).optional(),
  correctedDetails: z.string().trim().min(1).optional(),
  googleAccessToken: z.string().trim().min(1).optional(),
}).refine((value) => Boolean(value.newAddress || value.correctedDetails), {
  message: 'Corrected address text is required.',
  path: ['newAddress'],
});

const syncBodySchema = z.object({
  jobId: z.string().trim().min(1, 'Job id is required.'),
  originalClientName: z.string().trim().min(1, 'Client name is required.'),
  googleAccessToken: z.string().trim().optional(),
});

export const processReceiptRouter = Router();

// Firebase Cloud Functions (v2) handle multipart/form-data by consuming the stream
// before it reaches our Express app. This middleware reconstructs the stream from
// req.rawBody so that multer can parse it.
const firebaseMultipartFix = (req: Request, res: Response, next: NextFunction) => {
  const anyReq = req as any;
  if (anyReq.rawBody && !anyReq.readable) {
    const { Readable } = require('node:stream');
    const stream = new Readable();
    stream.push(anyReq.rawBody);
    stream.push(null);
    anyReq.pipe = (dest: any) => stream.pipe(dest);
    anyReq.on = (event: string, callback: any) => stream.on(event, callback);
    // @ts-ignore
    anyReq.unpipe = (dest: any) => stream.unpipe(dest);
    // Mark as readable again
    anyReq.readable = true;
  }
  next();
};

const handleProcessBill = async (request: Request, response: Response, next: NextFunction) => {
  let jobId = '';
  let originalClientName = '';
  let outputDir = '';

  try {
    const parsedBody = processBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return response.status(400).json({
        message: parsedBody.error.issues[0]?.message ?? 'Corrected address text is required.',
      });
    }

    const uploadedFile = (request as any).file;
    if (!uploadedFile) {
      return response.status(400).json({ message: 'A PDF file is required.' });
    }

    if (uploadedFile.mimetype !== 'application/pdf' && !uploadedFile.originalname.toLowerCase().endsWith('.pdf')) {
      return response.status(400).json({ message: 'Only PDF files are supported.' });
    }

    const correctedDetails = (parsedBody.data.newAddress ?? parsedBody.data.correctedDetails ?? '').trim();
    jobId = generateReceiptJobId();
    const processedReceipt = await processReceiptPdf({
      originalPdfBuffer: uploadedFile.buffer,
      originalFileName: uploadedFile.originalname,
      correctedDetails,
    });

    originalClientName = processedReceipt.clientName;
    const fixedDate = new Date().toLocaleDateString('en-GB');
    outputDir = await saveReceiptOutput({
      jobId,
      originalClientName: processedReceipt.clientName,
      originalDate: processedReceipt.originalDate,
      originalAddress: processedReceipt.originalAddress,
      correctedDetails,
      fixedDate,
      fixedFileName: processedReceipt.fixedFileName,
      originalPdfBuffer: uploadedFile.buffer,
      originalFileName: uploadedFile.originalname,
      fixedPdfBuffer: processedReceipt.fixedPdfBuffer,
    });

    const googleAccessToken = parsedBody.data.googleAccessToken?.trim();
    
    // Always attempt sync if we have a token OR if the server might have configured credentials
    let driveSync = null;
    try {
      driveSync = await syncSavedReceiptOutput({
        googleAccessToken,
        originalClientName: processedReceipt.clientName,
        jobId,
      });

      // CLEANUP: If sync is successful, delete the temp files immediately using sync method as requested
      if (driveSync && outputDir) {
        await fs.rm(outputDir, { recursive: true, force: true });
      }
    } catch (error) {
      // If sync fails, we log it but don't crash the request.
      console.warn('Auto-sync skipped or failed:', error instanceof Error ? error.message : error);
    }

    return response.json({
      jobId,
      originalClientName: processedReceipt.clientName,
      fixedClientName: processedReceipt.clientName,
      originalDate: processedReceipt.originalDate,
      originalAddress: processedReceipt.originalAddress,
      correctedDetails,
      fixedDate: fixedDate,
      fixedFileName: processedReceipt.fixedFileName,
      needsGoogleConnection: !driveSync,
      rootFolderWebViewUrl: driveSync?.rootFolder.webViewUrl,
      folderWebViewUrl: driveSync?.jobFolder.webViewUrl,
      originalFileWebViewUrl: driveSync?.originalFile.webViewUrl,
      fixedFileWebViewUrl: driveSync?.fixedFile.webViewUrl,
      // Local output URLs for temporary viewing before cleanup
      localOutputUrl: `/output/${toSafeDirName(processedReceipt.clientName)}/${jobId}`,
      localOriginalFileUrl: `/output/${toSafeDirName(processedReceipt.clientName)}/${jobId}/original.pdf`,
      localFixedFileUrl: `/output/${toSafeDirName(processedReceipt.clientName)}/${jobId}/fixed.pdf`,
    });
  } catch (error) {
    // Attempt cleanup on fatal error
    if (outputDir) {
      try {
        await fs.rm(outputDir, { recursive: true, force: true });
      } catch { /* Ignore cleanup errors in catch block */ }
    }

    const message = error instanceof Error ? error.message : 'Internal processing error';
    return response.status(500).json({ 
      message: `Failed to process receipt: ${message}`,
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

const handleSyncBill = async (request: Request, response: Response, next: NextFunction) => {
  let outputDir = '';
  try {
    const parsedBody = syncBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return response.status(400).json({
        message: parsedBody.error.issues[0]?.message ?? 'Google sync details are required.',
      });
    }

    const driveSync = await syncSavedReceiptOutput({
      googleAccessToken: parsedBody.data.googleAccessToken?.trim(),
      originalClientName: parsedBody.data.originalClientName.trim(),
      jobId: parsedBody.data.jobId.trim(),
    });

    // CLEANUP: If sync is successful, delete the temp files immediately
    const savedOutput = await loadReceiptOutput(parsedBody.data.originalClientName.trim(), parsedBody.data.jobId.trim());
    outputDir = savedOutput.outputDir;
    await fs.rm(outputDir, { recursive: true, force: true });

    return response.json({
      jobId: parsedBody.data.jobId.trim(),
      originalClientName: parsedBody.data.originalClientName.trim(),
      folderWebViewUrl: driveSync.jobFolder.webViewUrl,
      rootFolderWebViewUrl: driveSync.rootFolder.webViewUrl,
      originalFileWebViewUrl: driveSync.originalFile.webViewUrl,
      fixedFileWebViewUrl: driveSync.fixedFile.webViewUrl,
    });
  } catch (error) {
    // Attempt cleanup on error
    if (outputDir) {
      try {
        await fs.rm(outputDir, { recursive: true, force: true });
      } catch { /* Ignore */ }
    }
    return next(error);
  }
};

const firebaseMiddleware = process.env.NODE_ENV === 'production' ? firebaseMultipartFix : (req: Request, res: Response, next: NextFunction) => next();

processReceiptRouter.post('/process-bill', firebaseMiddleware, upload.single('file'), handleProcessBill);
processReceiptRouter.post('/process-receipt', firebaseMiddleware, upload.single('file'), handleProcessBill);
processReceiptRouter.post('/sync-bill', handleSyncBill);
