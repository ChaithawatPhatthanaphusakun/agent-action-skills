import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { processReceiptPdf } from '../src/services/pdfReceiptService.js';
import { fixPdfDates } from '../src/services/pdfDateService.js';
import { generateReceiptJobId, saveReceiptOutput } from '../src/services/outputService.js';
import { checkForUpdates } from './checkUpdate.js';

// Combined mode: rewrite the customer address AND apply field fixes (date, title,
// invoice/receipt no, due date, date paid, logo, separator lines) in ONE pass,
// producing a single output file. Invoked by bin/cli.js when the user provides a
// positional address together with one or more field flags.
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error('Usage: fixall <original-cwd> <path-to-pdf> "<new-address>" [DD/MM/YYYY] [--title <t>] [--invoice <no>] [--receipt <no>] [--due <text>] [--date-paid <text>] [--logo <image>] [--line]');
    process.exit(1);
  }

  const originalDir = args[0]!;
  const fileArg = args[1]!;
  const newAddress = args[2]!;
  let argIdx = 3;

  // Optional positional date (must come before flags)
  let newDate: string | undefined;
  if (args[argIdx] && /^\d{2}\/\d{2}\/\d{4}$/.test(args[argIdx]!)) {
    newDate = args[argIdx];
    argIdx++;
  }

  const remainingArgs = args.slice(argIdx);

  const convertIdx = remainingArgs.indexOf('--convert');
  const convertTitle: string | false =
    convertIdx >= 0
      ? (remainingArgs[convertIdx + 1] && !remainingArgs[convertIdx + 1]!.startsWith('-')
          ? remainingArgs[convertIdx + 1]!
          : 'ใบแจ้งหนี้')
      : false;

  const getFlag = (flag: string): string | undefined => {
    const idx = remainingArgs.indexOf(flag);
    if (idx === -1) return undefined;
    const val = remainingArgs[idx + 1];
    return val && !val.startsWith('-') ? val : undefined;
  };

  const newTitle = getFlag('--title');
  const newInvoiceNo = getFlag('--invoice');
  const newReceiptNo = getFlag('--receipt');
  const newDueDate = getFlag('--due');
  const newDatePaid = getFlag('--date-paid');
  const rawLogoPath = getFlag('--logo');
  const drawLine = remainingArgs.includes('--line');
  const newLogoPath = rawLogoPath ? path.resolve(originalDir, rawLogoPath) : undefined;
  const effectiveConvertTitle = newTitle !== undefined ? newTitle : convertTitle;

  if (newDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(newDate)) {
    console.error(`Invalid date format: "${newDate}". Expected DD/MM/YYYY (e.g. 18/05/2026)`);
    process.exit(1);
  }

  const pdfPath = path.resolve(originalDir, fileArg);
  console.log(`Loading PDF: ${pdfPath}`);
  console.log(`New Address: ${newAddress}`);

  let originalPdfBuffer: Buffer;
  try {
    originalPdfBuffer = await fs.readFile(pdfPath);
  } catch (error) {
    console.error(`Cannot read PDF: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const originalFileName = path.basename(pdfPath);

  try {
    // Step 1 — rewrite the customer address block.
    console.log('Processing PDF (1/2: address)...');
    const addressResult = await processReceiptPdf({
      originalPdfBuffer,
      originalFileName,
      correctedDetails: newAddress,
    });

    // Step 2 — apply field fixes to the address-corrected buffer.
    console.log('Processing PDF (2/2: fields)...');
    const fieldResult = await fixPdfDates({
      originalPdfBuffer: addressResult.fixedPdfBuffer,
      originalFileName,
      ...(newDate !== undefined ? { newDate } : {}),
      convertTitle: effectiveConvertTitle,
      ...(newInvoiceNo !== undefined ? { newInvoiceNo } : {}),
      ...(newReceiptNo !== undefined ? { newReceiptNo } : {}),
      ...(newDueDate !== undefined ? { newDueDate } : {}),
      ...(newDatePaid !== undefined ? { newDatePaid } : {}),
      ...(newLogoPath !== undefined ? { newLogoPath } : {}),
      drawLine,
    });

    // The final PDF is the field-fixed version of the address-corrected buffer.
    const finalPdfBuffer = fieldResult.fixedPdfBuffer;
    const fixedFileName = fieldResult.fixedFileName;

    // IMPORTANT: use the client name derived from the NEW address (step 1). The
    // step-2 re-parse would see the OLD (masked but still in the text layer)
    // Bill-to text and could reintroduce the garbled-name bug.
    const clientName = addressResult.clientName || 'Unknown_Client';

    const fixedItems: string[] = ['Address Rewritten'];
    if (fieldResult.replacedCount > 0) fixedItems.push(`Date → ${newDate}`);
    if (fieldResult.titleConverted) fixedItems.push(`Title → ${effectiveConvertTitle}`);
    if (fieldResult.invoiceNoFixed) fixedItems.push(`Invoice → ${newInvoiceNo}`);
    if (fieldResult.receiptNoFixed) fixedItems.push(`Receipt → ${newReceiptNo}`);
    if (fieldResult.dueDateFixed) fixedItems.push(`Due Date → ${newDueDate}`);
    if (fieldResult.datePaidFixed) fixedItems.push(`Date Paid → ${newDatePaid}`);
    if (fieldResult.logoFixed) fixedItems.push('Logo Replaced');
    if (fieldResult.linesDrawn) fixedItems.push('Separator Lines');

    const correctedDetails = fixedItems.join(', ');
    console.log(`Client Name detected: ${clientName}`);

    const jobId = generateReceiptJobId();
    const fixedDate = new Date().toLocaleDateString('en-GB');

    console.log('Saving fixed PDF locally...');
    const outputDir = await saveReceiptOutput({
      jobId,
      originalClientName: clientName,
      originalDate: addressResult.originalDate || fieldResult.originalDate || '',
      originalAddress: addressResult.originalAddress || '',
      correctedDetails,
      fixedDate,
      fixedFileName,
      originalPdfBuffer,
      originalFileName,
      fixedPdfBuffer: finalPdfBuffer,
    });

    console.log(`Locally saved in temporary directory: ${outputDir}`);

    const os = await import('node:os');
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const parsedOriginalPath = path.parse(pdfPath);
    const finalDestPath = path.join(downloadsDir, `${parsedOriginalPath.name}_edit.pdf`);

    await fs.copyFile(path.join(outputDir, 'fixed.pdf'), finalDestPath);

    console.log('\n✅ Done! Address + fields fixed. Saved to:');
    console.log(`   👉 ${finalDestPath}\n`);
  } catch (error) {
    console.error('Error during processing:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const repoDir = path.resolve(__dirname, '../..');
  checkForUpdates(repoDir);
}

main();
