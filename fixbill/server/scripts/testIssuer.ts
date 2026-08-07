import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ISSUER_LABEL_PATTERN, ISSUER_STOP_PATTERN, INVOICE_NO_LABEL_PATTERN, RECEIPT_NO_LABEL_PATTERN, DATE_LABEL_PATTERN } from '../src/utils/receiptHelpers.js';

type PdfTextItem = { str: string; transform: number[]; width: number; height: number; };

const buildRows = (items: PdfTextItem[]): Map<number, PdfTextItem[]> => {
  const rows = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Number(item.transform[5]);
    const existingY = Array.from(rows.keys()).find(ry => Math.abs(ry - y) <= 2.5);
    if (existingY === undefined) rows.set(y, [item]);
    else rows.get(existingY)!.push(item);
  }
  return rows;
};

const getIssuerDataRows = (items: PdfTextItem[]): PdfTextItem[][] => {
  const rows = buildRows(items);
  const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
  console.log(`[DEBUG] Total rows: ${sortedYs.length}`, sortedYs);

  let issuerStartY: number | null = null;
  let hasLabel = false;
  let pageMidpoint = 300; // rough guess

  for (const rowY of sortedYs) {
    if (rows.get(rowY)!.some(item => ISSUER_LABEL_PATTERN.test(item.str))) {
      issuerStartY = rowY;
      hasLabel = true;
      break;
    }
  }

  if (issuerStartY === null) {
    for (const rowY of sortedYs) {
      const rowItems = rows.get(rowY)!;
      const text = rowItems.map(i => i.str).join(' ').trim();
      
      console.log(`[DEBUG] -> Row Y=${rowY} Text="${text}"`);

      if (/^(Receipt|Invoice|Tax Invoice|ใบเสร็จ|ใบกำกับ|ใบเสนอราคา|Statement|Receipt number)$/i.test(text)) {
        console.log(`[DEBUG] Skipped as title`);
        continue;
      }
      
      try {
        if (INVOICE_NO_LABEL_PATTERN.test(text) || RECEIPT_NO_LABEL_PATTERN.test(text) || DATE_LABEL_PATTERN.test(text)) {
           console.log(`[DEBUG] Skipped as label`);
           continue;
        }
      } catch (e) {
        console.log(`[DEBUG] Error testing label:`, e);
      }
      
      const leftItems = rowItems.filter(i => i.str.trim() && Number(i.transform[4]) < pageMidpoint);
      if (leftItems.length > 0 && text.length > 2) {
        console.log(`[DEBUG] Found issuer start at Y=${rowY}`);
        issuerStartY = rowY;
        break;
      }
    }
  }

  if (issuerStartY === null) return [];

  const dataRows: PdfTextItem[][] = [];
  let prevY = issuerStartY;

  for (const rowY of sortedYs) {
    if (rowY > issuerStartY) continue;
    const rowItems = rows.get(rowY)!;
    
    if (dataRows.length > 0 && prevY - rowY > 45) break;

    let validItems = rowItems.filter(i => i.str.trim());

    if (hasLabel) {
      if (rowY === issuerStartY) {
        validItems = validItems.filter(i => !ISSUER_LABEL_PATTERN.test(i.str));
      }
      if (rowItems.some(item => ISSUER_STOP_PATTERN.test(item.str))) break;
    } else {
      validItems = validItems.filter(i => Number(i.transform[4]) < pageMidpoint);
      console.log(`[DEBUG_GATHER] Y=${rowY} validItems="${validItems.map(i=>i.str).join(' ')}"`);
      if (validItems.some(item => ISSUER_STOP_PATTERN.test(item.str))) {
        console.log(`[DEBUG_GATHER] Stopped at ISSUER_STOP_PATTERN: ${validItems.map(i=>i.str).join(' ')}`);
        break;
      }
    }

    if (validItems.length > 0) {
      dataRows.push(validItems);
      prevY = rowY;
    }
  }

  return dataRows;
};

async function main() {
  const pdfJs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfArg = process.argv[2];
  if (!pdfArg) { console.error('Usage: npx tsx testIssuer.ts <pdf-path>'); process.exit(1); }
  const buf = await fs.readFile(pdfArg);
  const loadingTask = pdfJs.getDocument({ data: new Uint8Array(buf), verbosity: 0 });
  const pdfJsDoc = await loadingTask.promise;
  const page = await pdfJsDoc.getPage(1);
  const textContent = await page.getTextContent();
  const items = textContent.items as PdfTextItem[];
  
  const issuerRows = getIssuerDataRows(items);
  console.log('ISSUER ROWS FOUND:');
  for (const row of issuerRows) {
    console.log(row.map(i => i.str).join(' '));
  }
}
main();