import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { fixPdfDates } from '../src/services/pdfDateService.js';
import { generateReceiptJobId, saveReceiptOutput } from '../src/services/outputService.js';
import { checkForUpdates } from './checkUpdate.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: fixbill <path> [DD/MM/YYYY] [--title <title>] [--invoice <no>] [--receipt <no>] [--due <text>] [--date-paid <text>] [--logo <image-path>]');
    process.exit(1);
  }

  const originalDir = args[0]!;
  const fileArg = args[1]!;
  let argIdx = 2;

  // Consume optional positional date (must come before flags)
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

  // --title takes precedence over --convert
  const effectiveConvertTitle = newTitle !== undefined ? newTitle : convertTitle;

  if (
    !newDate && !effectiveConvertTitle &&
    !newInvoiceNo && !newReceiptNo && !newDueDate && !newDatePaid &&
    !newLogoPath && !drawLine
  ) {
    console.error('No fix specified. Provide a date, --title, --invoice, --receipt, --due, --date-paid, --logo, or --line.');
    process.exit(1);
  }

  if (newDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(newDate)) {
    console.error(`Invalid date format: "${newDate}". Expected DD/MM/YYYY (e.g. 18/05/2026)`);
    process.exit(1);
  }

  const pdfPath = path.resolve(originalDir, fileArg);
  console.log(`Loading PDF: ${pdfPath}`);

  let originalPdfBuffer: Buffer;
  try {
    originalPdfBuffer = await fs.readFile(pdfPath);
  } catch (error) {
    console.error(`Cannot read PDF: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const originalFileName = path.basename(pdfPath);

  try {
    console.log('Processing PDF...');
    const result = await fixPdfDates({
      originalPdfBuffer,
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

    const fixedItems: string[] = [];
    if (result.replacedCount > 0) {
      console.log(`Dates replaced:        ${result.replacedCount} (was: ${result.oldDate})`);
      fixedItems.push(`Date → ${newDate}`);
    }
    if (result.titleConverted) {
      console.log(`Title fixed:           → ${effectiveConvertTitle}`);
      fixedItems.push(`Title → ${effectiveConvertTitle}`);
    }
    if (result.invoiceNoFixed) {
      console.log(`Invoice No. fixed:     → ${newInvoiceNo}`);
      fixedItems.push(`Invoice → ${newInvoiceNo}`);
    }
    if (result.receiptNoFixed) {
      console.log(`Receipt No. fixed:     → ${newReceiptNo}`);
      fixedItems.push(`Receipt → ${newReceiptNo}`);
    }
    if (result.dueDateFixed) {
      console.log(`Due date fixed:        → ${newDueDate}`);
      fixedItems.push(`Due Date → ${newDueDate}`);
    }
    if (result.datePaidFixed) {
      console.log(`Date paid fixed:       → ${newDatePaid}`);
      fixedItems.push(`Date Paid → ${newDatePaid}`);
    }
    if (result.logoFixed) {
      console.log(`Logo replaced:         ✓`);
      fixedItems.push(`Logo Replaced`);
    }
    if (result.linesDrawn) {
      console.log(`Separator lines drawn: ✓`);
      fixedItems.push(`Separator Lines`);
    }

    const correctedDetails = fixedItems.join(', ') || 'Fields Fixed';

    console.log(`Client Name detected: ${result.clientName || 'Unknown_Client'}`);

    const jobId = generateReceiptJobId();
    const fixedDate = new Date().toLocaleDateString('en-GB');

    console.log('Saving fixed PDF locally...');
    const outputDir = await saveReceiptOutput({
      jobId,
      originalClientName: result.clientName || 'Unknown_Client',
      originalDate: result.originalDate || '',
      originalAddress: '',
      correctedDetails,
      fixedDate,
      fixedFileName: result.fixedFileName,
      originalPdfBuffer,
      originalFileName,
      fixedPdfBuffer: result.fixedPdfBuffer,
    });

    console.log(`Locally saved in temporary directory: ${outputDir}`);

    const os = await import('node:os');
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const parsedOriginalPath = path.parse(pdfPath);
    const finalDestPath = path.join(downloadsDir, `${parsedOriginalPath.name}_edit.pdf`);

    await fs.copyFile(path.join(outputDir, 'fixed.pdf'), finalDestPath);

    console.log('\n✅ Done! Fixed PDF saved to:');
    console.log(`   👉 ${finalDestPath}\n`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Check for updates after the main operation completes
  const repoDir = path.resolve(__dirname, '../..');
  checkForUpdates(repoDir);
}

main();
