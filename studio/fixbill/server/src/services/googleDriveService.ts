import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { getServerEnv } from '../config/env.js';

const CREDENTIALS_PATH = path.join(os.homedir(), '.fixbill', 'credentials.json');

type SavedCredentials = {
  accessToken: string;
  expiresAt: number;
};

async function loadLocalCredentials(): Promise<SavedCredentials | null> {
  try {
    const data = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    const creds = JSON.parse(data) as SavedCredentials;
    if (!creds.accessToken || creds.expiresAt <= Date.now()) return null;
    return creds;
  } catch {
    return null;
  }
}
import {
  loadReceiptOutput,
  toSafeDirName,
  updateReceiptOutputMetadata,
} from './outputService.js';

export type DriveFileMetadata = {
  id: string;
  name: string;
  webViewUrl: string;
};

export type DriveSyncResult = {
  rootFolder: DriveFileMetadata;
  clientFolder: DriveFileMetadata;
  jobFolder: DriveFileMetadata;
  originalFile: DriveFileMetadata;
  fixedFile: DriveFileMetadata;
};

const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const FIXBILL_ROOT_FOLDER = process.env['FIXBILL_DRIVE_FOLDER'] ?? 'fixbill';

const escapeQueryValue = (value: string): string => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const buildFolderUrl = (folderId: string): string => `https://drive.google.com/drive/folders/${folderId}`;

const buildFileUrl = (fileId: string): string => `https://drive.google.com/file/d/${fileId}/view`;

const buildDateTag = (value: Date): string => {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}-${month}-${year}`;
};

const buildJobFolderName = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

const buildDriveClient = async (googleAccessToken?: string) => {
  // Prefer: passed-in token > saved local token > env refresh token (legacy)
  const token = googleAccessToken ?? (await loadLocalCredentials())?.accessToken;

  if (token) {
    const oauthClient = new google.auth.OAuth2();
    oauthClient.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth: oauthClient });
  }

  // Legacy fallback: env-based refresh token
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = getServerEnv();
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    const oauthClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oauthClient.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth: oauthClient });
  }

  throw new Error('Not connected to Google Drive. Run "FixBill login" to connect.');
};

const getOrCreateFolder = async (
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentFolderId?: string,
): Promise<DriveFileMetadata> => {
  const queryParts = [
    `name='${escapeQueryValue(folderName)}'`,
    `mimeType='${DRIVE_FOLDER_MIME_TYPE}'`,
    'trashed=false',
  ];

  if (parentFolderId) {
    queryParts.push(`'${parentFolderId}' in parents`);
  }

  const listResponse = await drive.files.list({
    q: queryParts.join(' and '),
    fields: 'files(id,name,webViewLink)',
    spaces: 'drive',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const existingFolder = listResponse.data.files?.[0];
  if (existingFolder?.id) {
    return {
      id: existingFolder.id,
      name: existingFolder.name ?? folderName,
      webViewUrl: existingFolder.webViewLink ?? buildFolderUrl(existingFolder.id),
    };
  }

  const createdFolder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: DRIVE_FOLDER_MIME_TYPE,
      ...(parentFolderId ? { parents: [parentFolderId] } : {}),
    },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });

  const folderId = createdFolder.data.id;
  if (!folderId) {
    throw new Error(`Google Drive did not return an id while creating folder ${folderName}.`);
  }

  return {
    id: folderId,
    name: createdFolder.data.name ?? folderName,
    webViewUrl: createdFolder.data.webViewLink ?? buildFolderUrl(folderId),
  };
};

const uploadPdfBuffer = async (
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  fileName: string,
  pdfBuffer: Buffer,
): Promise<DriveFileMetadata> => {
  const uploadResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(pdfBuffer),
    },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });

  const fileId = uploadResponse.data.id;
  if (!fileId) {
    throw new Error(`Google Drive did not return an id while uploading ${fileName}.`);
  }

  return {
    id: fileId,
    name: uploadResponse.data.name ?? fileName,
    webViewUrl: uploadResponse.data.webViewLink ?? buildFileUrl(fileId),
  };
};

const uploadPdfFromPath = async (
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  fileName: string,
  filePath: string,
): Promise<DriveFileMetadata> => {
  const pdfBuffer = await fs.readFile(filePath);
  return uploadPdfBuffer(drive, folderId, fileName, pdfBuffer);
};

const buildCachedDriveResult = (savedOutput: Awaited<ReturnType<typeof loadReceiptOutput>>): DriveSyncResult => ({
  rootFolder: {
    id: 'cached',
    name: FIXBILL_ROOT_FOLDER,
    webViewUrl: savedOutput.rootFolderWebViewUrl ?? '',
  },
  clientFolder: {
    id: 'cached',
    name: toSafeDirName(savedOutput.originalClientName),
    webViewUrl: savedOutput.folderWebViewUrl ?? '', // Historically we used folderWebViewUrl for the client folder
  },
  jobFolder: {
    id: 'cached',
    name: 'Transformation',
    webViewUrl: savedOutput.folderWebViewUrl ?? '',
  },
  originalFile: {
    id: 'cached',
    name: savedOutput.originalFileName,
    webViewUrl: savedOutput.originalFileWebViewUrl ?? '',
  },
  fixedFile: {
    id: 'cached',
    name: savedOutput.fixedFileName,
    webViewUrl: savedOutput.fixedFileWebViewUrl ?? '',
  },
});

export const syncSavedReceiptOutput = async ({
  googleAccessToken,
  originalClientName,
  jobId,
}: {
  googleAccessToken?: string | undefined;
  originalClientName: string;
  jobId: string;
}): Promise<DriveSyncResult> => {
  const savedOutput = await loadReceiptOutput(originalClientName, jobId);

  if (savedOutput.rootFolderWebViewUrl && savedOutput.folderWebViewUrl && savedOutput.originalFileWebViewUrl && savedOutput.fixedFileWebViewUrl) {
    return buildCachedDriveResult(savedOutput);
  }

  const drive = await buildDriveClient(googleAccessToken);
  const { GOOGLE_DRIVE_PARENT_ID, GOOGLE_DRIVE_PARENT_FOLDER_ID } = getServerEnv();
  const parentId = GOOGLE_DRIVE_PARENT_ID || GOOGLE_DRIVE_PARENT_FOLDER_ID;
  
  // 1. Root folder (configurable via FIXBILL_DRIVE_FOLDER env var)
  const rootFolder = await getOrCreateFolder(drive, FIXBILL_ROOT_FOLDER, parentId);
  
  // 2. Client Folder: e.g. "บริษัท ทดสอบ จำกัด"
  // We use the client name directly as requested
  const clientFolderName = savedOutput.originalClientName;
  const clientFolder = await getOrCreateFolder(drive, clientFolderName, rootFolder.id);
  
  // 3. Timestamp Folder: "YYYY-MM-DD_HH-MM-SS"
  const createdAt = new Date(savedOutput.createdAt);
  const jobFolderName = buildJobFolderName(createdAt);
  const jobFolder = await getOrCreateFolder(drive, jobFolderName, clientFolder.id);
  
  // 4. File Names: "DD-MM-YYYY-issueBill-[clientName].pdf"
  const dateTag = buildDateTag(createdAt);
  const originalDriveFileName = `${dateTag}-issueBill-${savedOutput.originalClientName}.pdf`;
  const fixedDriveFileName = `${dateTag}-FixBill-${savedOutput.originalClientName}.pdf`;
  
  // 5. Upload files into the Level 3 folder
  const originalFile = await uploadPdfFromPath(drive, jobFolder.id, originalDriveFileName, savedOutput.originalPdfPath);
  const fixedFile = await uploadPdfFromPath(drive, jobFolder.id, fixedDriveFileName, savedOutput.fixedPdfPath);

  await updateReceiptOutputMetadata(savedOutput.originalClientName, savedOutput.jobId, {
    rootFolderWebViewUrl: rootFolder.webViewUrl,
    folderWebViewUrl: jobFolder.webViewUrl, // Save the specific job folder URL for UI history
    originalFileWebViewUrl: originalFile.webViewUrl,
    fixedFileWebViewUrl: fixedFile.webViewUrl,
    syncedAt: new Date().toISOString(),
  });

  return {
    rootFolder,
    clientFolder,
    jobFolder,
    originalFile,
    fixedFile,
  };
};
