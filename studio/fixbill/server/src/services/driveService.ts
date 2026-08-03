import { google } from 'googleapis';
import { getServerEnv } from '../config/env.js';

const getAuthClient = () => {
  const env = getServerEnv();
  const auth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  auth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN || null });
  return auth;
};

export const getOrCreateFolder = async (folderName: string, parentId?: string): Promise<string> => {
  const drive = google.drive({ version: 'v3', auth: getAuthClient() });
  const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
  const list = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
  if (list.data.files?.[0]?.id) return list.data.files[0].id;

  const created = await drive.files.create({
    requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) },
    fields: 'id',
  });
  return created.data.id!;
};

export const uploadFile = async (fileName: string, pdfBuffer: Buffer, folderId: string): Promise<string> => {
  const drive = google.drive({ version: 'v3', auth: getAuthClient() });
  const { Readable } = await import('stream');
  const uploaded = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: 'application/pdf', body: Readable.from(pdfBuffer) },
    fields: 'id',
  });
  return uploaded.data.id!;
};
