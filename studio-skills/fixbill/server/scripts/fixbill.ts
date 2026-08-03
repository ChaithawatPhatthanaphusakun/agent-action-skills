import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Configure dotenv to read from server/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

import { processReceiptPdf } from '../src/services/pdfReceiptService.js';
import { generateReceiptJobId, saveReceiptOutput } from '../src/services/outputService.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: npm run fixbill <original-cwd> <path-to-pdf> "<new-address>"');
    process.exit(1);
  }

  const originalDir = args[0];
  const fileArg = args[1];
  const newAddress = args[2];

  if (!originalDir || !fileArg || !newAddress) {
    console.error('Usage: npm run fixbill <original-cwd> <path-to-pdf> "<new-address>"');
    process.exit(1);
  }

  // Resolve the path based on the directory where the user ran the command
  const pdfPath = path.resolve(originalDir, fileArg);

  console.log(`Loading PDF from: ${pdfPath}`);
  console.log(`New Address: ${newAddress}`);

  let originalPdfBuffer: Buffer;
  try {
    originalPdfBuffer = await fs.readFile(pdfPath);
  } catch (error) {
    console.error(`Error reading PDF file: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const originalFileName = path.basename(pdfPath);
  const jobId = generateReceiptJobId();

  try {
    console.log('Processing PDF...');
    const processedReceipt = await processReceiptPdf({
      originalPdfBuffer,
      originalFileName,
      correctedDetails: newAddress,
    });

    console.log('PDF Processed Successfully.');
    console.log(`Client Name detected: ${processedReceipt.clientName}`);

    const fixedDate = new Date().toLocaleDateString('en-GB');

    console.log('Saving fixed PDF locally...');
    const outputDir = await saveReceiptOutput({
      jobId,
      originalClientName: processedReceipt.clientName,
      originalDate: processedReceipt.originalDate,
      originalAddress: processedReceipt.originalAddress,
      correctedDetails: newAddress,
      fixedDate,
      fixedFileName: processedReceipt.fixedFileName,
      originalPdfBuffer,
      originalFileName,
      fixedPdfBuffer: processedReceipt.fixedPdfBuffer,
    });

    console.log(`Locally saved in temporary directory: ${outputDir}`);

    // Make a copy in the user's Downloads directory
    const parsedOriginalPath = path.parse(pdfPath);
    const os = await import('node:os');
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const finalDestPath = path.join(downloadsDir, `${parsedOriginalPath.name}_edit.pdf`);
    
    await fs.copyFile(path.join(outputDir, 'fixed.pdf'), finalDestPath);
    console.log('\n✅ SUCCESS: The fixed PDF has been saved here:');
    console.log(`   👉 ${finalDestPath}\n`);

  } catch (error) {
    console.error('Error during processing:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();