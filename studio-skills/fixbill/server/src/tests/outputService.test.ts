/**
 * Integration test for outputService.
 * Verifies that saveReceiptOutput creates the correct folder structure
 * and writes all three files with the right content.
 */
import { describe, it, expect, afterAll } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { saveReceiptOutput } from '../services/outputService.js';

const SAMPLE_PDF_BUFFER = Buffer.from('%PDF-1.7\n% fixture-free test buffer\n%%EOF\n');

const TEST_CASES = [
  {
    jobId: 'test-job-id-1',
    originalAddress: 'Original address 1',
    originalClientName: 'บริษัท ทดสอบ จำกัด',
    originalDate: '24/04/2026',
    correctedDetails: 'บริษัท ทดสอบ จำกัด 99/9 ถ.ตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กทม. 10000',
    fixedDate: '05/05/2026',
    fixedFileName: 'Original_receipt copy_1.pdf',
    originalFileName: 'Original_receipt copy.pdf',
  },
  {
    jobId: 'test-job-id-2',
    originalAddress: 'Original address 2',
    originalClientName: 'บริษัท ตัวอย่าง อุตสาหกรรม',
    originalDate: '25/04/2026',
    correctedDetails: 'บริษัท ตัวอย่าง อุตสาหกรรม จำกัด\nเลขประจำตัวผู้เสียภาษี 0999999999999\n99/9 ถ.ตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10000',
    fixedDate: '05/05/2026',
    fixedFileName: 'Original_receipt copy_1.pdf',
    originalFileName: 'Original_receipt copy.pdf',
  },
  {
    jobId: 'test-job-id-3',
    originalAddress: 'Original address 3',
    originalClientName: 'ABC Trading',
    originalDate: '01/05/2026',
    correctedDetails: 'ABC Trading Co., Ltd.\n99/9 Sukhumvit Rd, Khlong Toei, Bangkok 10110\nTax ID: 0-1055-12345-678',
    fixedDate: '05/05/2026',
    fixedFileName: 'Original_receipt copy_1.pdf',
    originalFileName: 'Original_receipt copy.pdf',
  },
];

describe('outputService — saveReceiptOutput', () => {
  const originalPdfBuffer = SAMPLE_PDF_BUFFER;
  const outputDirs: string[] = [];

  // Clean up test output folders after all tests
  afterAll(async () => {
    for (const dir of outputDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  for (const tc of TEST_CASES) {
    it(`creates correct Output folder for: ${tc.originalClientName}`, async () => {
      const fixedPdfBuffer = Buffer.from(originalPdfBuffer); // use same PDF bytes as "fixed" for test purposes

      const clientDir = await saveReceiptOutput({
        ...tc,
        originalPdfBuffer,
        fixedPdfBuffer,
      });
      outputDirs.push(clientDir);

      // 1. Folder exists
      const stat = await fs.stat(clientDir);
      expect(stat.isDirectory()).toBe(true);

      // 2. original PDF saved
      const originalPath = path.join(clientDir, 'original.pdf');
      const savedOriginal = await fs.readFile(originalPath);
      expect(savedOriginal.length).toBe(originalPdfBuffer.length);

      // 3. fixed PDF saved
      const fixedPath = path.join(clientDir, 'fixed.pdf');
      const savedFixed = await fs.readFile(fixedPath);
      expect(savedFixed.length).toBe(fixedPdfBuffer.length);

      // 4. metadata.json saved with correct content
      const metaPath = path.join(clientDir, 'metadata.json');
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      expect(meta.originalClientName).toBe(tc.originalClientName);
      expect(meta.originalDate).toBe(tc.originalDate);
      expect(meta.correctedDetails).toBe(tc.correctedDetails);
      expect(meta.fixedDate).toBe(tc.fixedDate);
      expect(meta.fixedFileName).toBe(tc.fixedFileName);
    });
  }
});
