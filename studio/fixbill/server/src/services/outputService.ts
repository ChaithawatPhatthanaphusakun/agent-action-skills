import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

const OUTPUT_ROOT = os.tmpdir();

export const toSafeDirName = (name: string): string =>
  name.replace(/[^\p{L}\p{N}]+/gu, '_').trim() || 'Unknown_Client';

export const generateReceiptJobId = () => `${Date.now()}-${randomUUID().slice(0, 8)}`;

export type ReceiptOutputMetadata = {
  jobId: string;
  originalClientName: string;
  originalDate: string;
  originalAddress: string;
  correctedDetails: string;
  fixedDate: string;
  fixedFileName: string;
  originalFileName: string;
  createdAt: string;
  rootFolderWebViewUrl?: string | undefined;
  folderWebViewUrl?: string | undefined;
  originalFileWebViewUrl?: string | undefined;
  fixedFileWebViewUrl?: string | undefined;
  syncedAt?: string | undefined;
};

export type SavedReceiptOutput = ReceiptOutputMetadata & {
  outputDir: string;
  metadataPath: string;
  originalPdfPath: string;
  fixedPdfPath: string;
};

const buildOutputDir = (originalClientName: string, jobId: string): string =>
  path.join(OUTPUT_ROOT, toSafeDirName(originalClientName), jobId);

export const saveReceiptOutput = async ({
  jobId = generateReceiptJobId(),
  originalClientName,
  originalDate,
  originalAddress,
  correctedDetails,
  fixedDate,
  fixedFileName,
  originalPdfBuffer,
  originalFileName,
  fixedPdfBuffer,
}: Omit<ReceiptOutputMetadata, 'createdAt' | 'rootFolderWebViewUrl' | 'folderWebViewUrl' | 'originalFileWebViewUrl' | 'fixedFileWebViewUrl' | 'syncedAt'> & {
  jobId?: string;
  originalPdfBuffer: Buffer;
  originalFileName: string;
  fixedPdfBuffer: Buffer;
}): Promise<string> => {
  const outputDir = buildOutputDir(originalClientName, jobId);
  const metadataPath = path.join(outputDir, 'metadata.json');
  const originalPdfPath = path.join(outputDir, 'original.pdf');
  const fixedPdfPath = path.join(outputDir, 'fixed.pdf');
  const createdAt = new Date().toISOString();

  await fs.mkdir(outputDir, { recursive: true });

  const metadata: ReceiptOutputMetadata = {
    jobId,
    originalClientName,
    originalDate,
    originalAddress,
    correctedDetails,
    fixedDate,
    fixedFileName,
    originalFileName,
    createdAt,
  };

  await Promise.all([
    fs.writeFile(originalPdfPath, originalPdfBuffer),
    fs.writeFile(fixedPdfPath, fixedPdfBuffer),
    fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2)),
  ]);

  return outputDir;
};

export const loadReceiptOutput = async (originalClientName: string, jobId: string): Promise<SavedReceiptOutput> => {
  const outputDir = buildOutputDir(originalClientName, jobId);
  const metadataPath = path.join(outputDir, 'metadata.json');
  const originalPdfPath = path.join(outputDir, 'original.pdf');
  const fixedPdfPath = path.join(outputDir, 'fixed.pdf');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as ReceiptOutputMetadata;

  return {
    ...metadata,
    outputDir,
    metadataPath,
    originalPdfPath,
    fixedPdfPath,
  };
};

export const updateReceiptOutputMetadata = async (
  originalClientName: string,
  jobId: string,
  patch: Partial<ReceiptOutputMetadata>,
): Promise<SavedReceiptOutput> => {
  const savedOutput = await loadReceiptOutput(originalClientName, jobId);
  const nextMetadata: ReceiptOutputMetadata = {
    jobId: savedOutput.jobId,
    originalClientName: savedOutput.originalClientName,
    originalDate: savedOutput.originalDate,
    originalAddress: savedOutput.originalAddress,
    correctedDetails: savedOutput.correctedDetails,
    fixedDate: savedOutput.fixedDate,
    fixedFileName: savedOutput.fixedFileName,
    originalFileName: savedOutput.originalFileName,
    createdAt: savedOutput.createdAt,
    rootFolderWebViewUrl: savedOutput.rootFolderWebViewUrl,
    folderWebViewUrl: savedOutput.folderWebViewUrl,
    originalFileWebViewUrl: savedOutput.originalFileWebViewUrl,
    fixedFileWebViewUrl: savedOutput.fixedFileWebViewUrl,
    syncedAt: savedOutput.syncedAt,
    ...patch,
  };

  await fs.writeFile(savedOutput.metadataPath, JSON.stringify(nextMetadata, null, 2));

  return {
    ...nextMetadata,
    outputDir: savedOutput.outputDir,
    metadataPath: savedOutput.metadataPath,
    originalPdfPath: savedOutput.originalPdfPath,
    fixedPdfPath: savedOutput.fixedPdfPath,
  };
};
