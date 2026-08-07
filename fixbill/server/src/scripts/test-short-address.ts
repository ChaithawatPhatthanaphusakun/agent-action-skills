import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processReceiptPdf } from '../services/pdfReceiptService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(__dirname, '../../../Reference/Original_receipt copy.pdf');

async function test() {
  const originalPdfBuffer = fs.readFileSync(pdfPath);
  const correctedDetailsShort = 'Short Address Line 1';
  const correctedDetailsLong = 'Long Company Name Limited\nAddress Line 1, District, Province\nPostcode 12345\nTax ID: 0123456789';

  console.log('Generating PDF with short address...');
  const shortResult = await processReceiptPdf({
    originalPdfBuffer,
    originalFileName: 'test.pdf',
    correctedDetails: correctedDetailsShort,
  });
  fs.writeFileSync('short_address_output.pdf', shortResult.fixedPdfBuffer);
  console.log('Saved short_address_output.pdf');

  console.log('Generating PDF with long address...');
  const longResult = await processReceiptPdf({
    originalPdfBuffer,
    originalFileName: 'test.pdf',
    correctedDetails: correctedDetailsLong,
  });
  fs.writeFileSync('long_address_output.pdf', longResult.fixedPdfBuffer);
  console.log('Saved long_address_output.pdf');
}

test().catch(console.error);
