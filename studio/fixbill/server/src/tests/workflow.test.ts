import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pdfParse from 'pdf-parse';
import type { Express } from 'express';

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const REFERENCE_DIR = path.resolve(__dirname, '../../../Reference');
const INPUT_PDF = path.join(REFERENCE_DIR, 'Original_receipt copy.pdf');

// Structured with newlines, matching the convention documented in SKILL.md
// (company name on its own line) — real callers never pass a single unbroken line.
const NEW_ADDRESS =
  'บริษัท ทดสอบ จำกัด\n99/9 ถ.ตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กทม. 10000\nหมายเลขผู้เสียภาษี 0-0000-00000-000';
const EXPECTED_FOLDER = 'บริษัท ทดสอบ';

const workflowIt = fs.existsSync(INPUT_PDF) ? it : it.skip;

describe('POST /api/process-receipt — full workflow', () => {
  let app: Express;
  let syncSavedReceiptOutput: jest.Mock<() => Promise<null>>;

  beforeAll(async () => {
    if (!fs.existsSync(INPUT_PDF)) return;

    syncSavedReceiptOutput = jest.fn(async () => null);
    jest.unstable_mockModule('../services/googleDriveService.js', () => ({
      syncSavedReceiptOutput,
    }));

    const { createApp } = await import('../index.js');
    app = createApp();
  });

  workflowIt('creates a real fixed PDF artifact and derives the folder name from the corrected address', async () => {
    const response = await request(app)
      .post('/api/process-receipt')
      .attach('file', INPUT_PDF)
      .field('newAddress', NEW_ADDRESS);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.originalClientName).toBe(EXPECTED_FOLDER);
    expect(response.body.localFixedFileUrl).toEqual(expect.stringMatching(/^\/output\/.+\/fixed\.pdf$/));
    expect(syncSavedReceiptOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        originalClientName: EXPECTED_FOLDER,
      }),
    );

    const fixedPdfPath = path.join(os.tmpdir(), response.body.localFixedFileUrl.replace(/^\/output\//, ''));
    const fixedPdfBuffer = await fsp.readFile(fixedPdfPath);
    const parsed = await pdfParse(fixedPdfBuffer);

    expect(parsed.text).toContain('บริษัท ทดสอบ');
  });
});
