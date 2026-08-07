import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import pdfParse from 'pdf-parse';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getServerEnv } from '../config/env.js';
import {
  buildFixedFileName,
  extractOriginalDateFromText,
  extractClientNameFromText,
  wrapTextByWidth,
  DATE_LABEL_PATTERN,
  INVOICE_NO_LABEL_PATTERN,
  RECEIPT_NO_LABEL_PATTERN,
  DUE_DATE_LABEL_PATTERN,
  DATE_PAID_LABEL_PATTERN,
  ISSUER_LABEL_PATTERN,
  ISSUER_STOP_PATTERN,
} from '../utils/receiptHelpers.js';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

type BBox = { x: number; y: number; width: number; height: number };

export type FixDateInput = {
  originalPdfBuffer: Buffer;
  originalFileName: string;
  newDate?: string;
  convertTitle?: string | false;
  newInvoiceNo?: string;
  newReceiptNo?: string;
  newDueDate?: string;
  newDatePaid?: string;
  newIssuer?: string;
  newLogoPath?: string;
  newCompany?: string;
  newIssuerAddress?: string;
  drawLine?: boolean;
};

export type FixDateOutput = {
  fixedPdfBuffer: Buffer;
  fixedFileName: string;
  clientName: string;
  originalDate?: string;
  oldDate?: string;
  replacedCount: number;
  titleConverted: boolean;
  invoiceNoFixed: boolean;
  receiptNoFixed: boolean;
  dueDateFixed: boolean;
  datePaidFixed: boolean;
  logoFixed: boolean;
  linesDrawn: boolean;
};

const loadPdfJs = async (): Promise<PdfJsModule> =>
  import('pdfjs-dist/legacy/build/pdf.mjs');

const loadThaiFontBytes = async (isBold = false): Promise<Uint8Array> => {
  const serverEnv = getServerEnv();
  const configuredPath = serverEnv.THAI_FONT_PATH?.trim();
  let resolvedFontPath = configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../assets/fonts/NotoSansThai-Regular.ttf',
      );
      
  if (isBold && !configuredPath) {
     resolvedFontPath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../assets/fonts/NotoSansThai-Bold.ttf',
      );
  }

  try {
    return await fs.readFile(resolvedFontPath);
  } catch {
    throw new Error(
      `Unable to load Thai font at ${resolvedFontPath}. Set THAI_FONT_PATH to a valid TTF file.`,
    );
  }
};

const buildRows = (items: PdfTextItem[]): Map<number, PdfTextItem[]> => {
  const rows = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Number(item.transform[5]);
    const existingY = Array.from(rows.keys()).find(ry => Math.abs(ry - y) <= 2.5);
    if (existingY === undefined) {
      rows.set(y, [item]);
    } else {
      rows.get(existingY)!.push(item);
    }
  }
  return rows;
};

const findTextBBoxes = (items: PdfTextItem[], searchText: string): BBox[] => {
  const results: BBox[] = [];
  const rows = buildRows(items);

  for (const rowItems of rows.values()) {
    rowItems.sort((a, b) => Number(a.transform[4]) - Number(b.transform[4]));

    type Span = { start: number; end: number; item: PdfTextItem };
    const spans: Span[] = [];
    let cursor = 0;
    for (const item of rowItems) {
      spans.push({ start: cursor, end: cursor + item.str.length, item });
      cursor += item.str.length;
    }

    const rowText = rowItems.map(i => i.str).join('');
    let idx = 0;
    while ((idx = rowText.indexOf(searchText, idx)) !== -1) {
      const end = idx + searchText.length;
      const hit = spans.filter(s => s.start < end && s.end > idx);
      if (hit.length) {
        const xs = hit.map(s => Number(s.item.transform[4]));
        const rights = hit.map(s => Number(s.item.transform[4]) + Number(s.item.width));
        const ys = hit.map(s => Number(s.item.transform[5]));
        const heights = hit.map(s => Number(s.item.height));
        results.push({
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...rights) - Math.min(...xs),
          height: Math.max(...heights),
        });
      }
      idx++;
    }
  }

  return results;
};

const findTitleBBox = (items: PdfTextItem[]): BBox | null => {
  const TARGETS = ['ใบเสนอราคา', 'ใบแจ้งหนี้', 'ใบเสร็จรับเงิน', 'Receipt', 'Invoice', 'Tax Invoice', 'ใบกำกับภาษี'];
  for (const target of TARGETS) {
    const boxes = findTextBBoxes(items, target);
    if (boxes[0]) return boxes[0];
  }
  return null;
};

const combineBBoxes = (items: PdfTextItem[]): BBox => {
  const xs = items.map(i => Number(i.transform[4]));
  const rights = items.map(i => Number(i.transform[4]) + Number(i.width));
  const ys = items.map(i => Number(i.transform[5]));
  const heights = items.map(i => Number(i.height));
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...rights) - Math.min(...xs),
    height: Math.max(...heights),
  };
};

const findValueAfterLabel = (items: PdfTextItem[], labelPattern: RegExp): BBox | null => {
  const rows = buildRows(items);
  const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);

  for (let i = 0; i < sortedYs.length; i++) {
    const rowY = sortedYs[i]!;
    const rowItems = rows.get(rowY)!.slice().sort((a, b) => Number(a.transform[4]) - Number(b.transform[4]));

    const labelIdx = rowItems.findIndex(item => labelPattern.test(item.str));
    if (labelIdx === -1) continue;

    const afterItems = rowItems.slice(labelIdx + 1).filter(i => i.str.trim() && !labelPattern.test(i.str));
    if (afterItems.length > 0) {
      return combineBBoxes(afterItems);
    }

    const nextY = sortedYs[i + 1];
    if (nextY !== undefined) {
      const nextRow = rows.get(nextY)!.slice().sort((a, b) => Number(a.transform[4]) - Number(b.transform[4]));
      const labelX = Number(rowItems[labelIdx]!.transform[4]);
      const aligned = nextRow.filter(it => it.str.trim() && Number(it.transform[4]) >= labelX - 20);
      if (aligned.length > 0) return combineBBoxes(aligned);
    }
  }
  return null;
};

// Returns data rows of the issuer block: [companyRow, ...addressRows]
const getIssuerDataRows = (items: PdfTextItem[]): PdfTextItem[][] => {
  const rows = buildRows(items);
  const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);

  let issuerStartY: number | null = null;
  let hasLabel = false;
  let pageMidpoint = 300;

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
      
      if (/^(Receipt|Invoice|Tax Invoice|ใบเสร็จ|ใบกำกับ|ใบเสนอราคา|Statement|Receipt number)$/i.test(text)) continue;
      if (INVOICE_NO_LABEL_PATTERN.test(text) || RECEIPT_NO_LABEL_PATTERN.test(text) || DATE_LABEL_PATTERN.test(text)) continue;
      
      const leftItems = rowItems.filter(i => i.str.trim() && Number(i.transform[4]) < pageMidpoint);
      if (leftItems.length > 0 && text.length > 2) {
        if (!leftItems.some(i => ISSUER_STOP_PATTERN.test(i.str))) {
          issuerStartY = rowY;
          break;
        } else {
          const beforeBillTo = leftItems.filter(i => !ISSUER_STOP_PATTERN.test(i.str));
          if (beforeBillTo.length > 0) {
            issuerStartY = rowY;
            break;
          }
        }
      }
    }
  }

  if (issuerStartY === null) return [];

  const dataRows: PdfTextItem[][] = [];
  let prevY = issuerStartY;
  let issuerStartX: number | null = null;
  
  const startRowItems = rows.get(issuerStartY)!.filter(i => i.str.trim());
  if (hasLabel) {
    const labelItem = startRowItems.find(i => ISSUER_LABEL_PATTERN.test(i.str));
    if (labelItem) issuerStartX = Number(labelItem.transform[4]);
  } else {
    const valid = startRowItems.filter(i => !ISSUER_STOP_PATTERN.test(i.str) && Number(i.transform[4]) < pageMidpoint);
    if (valid.length > 0) {
      issuerStartX = Math.min(...valid.map(i => Number(i.transform[4])));
    }
  }
  
  if (issuerStartX === null) issuerStartX = 30;

  const COLUMN_TOLERANCE = 150;

  for (const rowY of sortedYs) {
    if (rowY > issuerStartY) continue;
    const rowItems = rows.get(rowY)!;
    
    if (dataRows.length > 0 && prevY - rowY > 45) break;

    let validItems = rowItems.filter(i => i.str.trim() && 
      Number(i.transform[4]) >= issuerStartX! - 20 && 
      Number(i.transform[4]) <= issuerStartX! + COLUMN_TOLERANCE
    );

    if (hasLabel && rowY === issuerStartY) {
      validItems = validItems.filter(i => !ISSUER_LABEL_PATTERN.test(i.str));
    }

    if (validItems.some(item => ISSUER_STOP_PATTERN.test(item.str))) break;

    if (validItems.length > 0) {
      dataRows.push(validItems);
      prevY = rowY;
    }
  }

  return dataRows;
};

const locateIssuerBox = (items: PdfTextItem[]): BBox | null => {
  const allItems = getIssuerDataRows(items).flat();
  return allItems.length > 0 ? combineBBoxes(allItems) : null;
};

const findIssuerCompanyBBox = (items: PdfTextItem[]): BBox | null => {
  const first = getIssuerDataRows(items)[0];
  return first && first.length > 0 ? combineBBoxes(first) : null;
};

const findIssuerAddressBBox = (items: PdfTextItem[]): BBox | null => {
  const addrItems = getIssuerDataRows(items).slice(1).flat();
  return addrItems.length > 0 ? combineBBoxes(addrItems) : null;
};

export const fixPdfDates = async ({
  originalPdfBuffer,
  originalFileName,
  newDate,
  convertTitle = false,
  newInvoiceNo,
  newReceiptNo,
  newDueDate,
  newDatePaid,
  newLogoPath,
  drawLine = false,
}: FixDateInput): Promise<FixDateOutput> => {
  const newTitleText = typeof convertTitle === 'string' ? convertTitle : 'ใบแจ้งหนี้';
  const pdfJs = await loadPdfJs();
  const thaiFontBytes = await loadThaiFontBytes();
  const thaiBoldFontBytes = await loadThaiFontBytes(true);

  const loadingTask = pdfJs.getDocument({ data: new Uint8Array(originalPdfBuffer), verbosity: 0 });
  const pdfJsDoc = await loadingTask.promise;
  const firstPage = await pdfJsDoc.getPage(1);
  const textContent = await firstPage.getTextContent();
  const items = textContent.items as PdfTextItem[];
  
  const parsedPdf = await pdfParse(originalPdfBuffer);
  const fullTextWithNewlines = parsedPdf.text || items.map(i => i.str).join('\n');
  const fullText = items.map(i => i.str).join(' ');

  const clientName = extractClientNameFromText(fullTextWithNewlines);
  const originalDate = extractOriginalDateFromText(fullText);
  const oldDate = newDate ? extractOriginalDateFromText(fullText) : undefined;
  let dateBoxes: BBox[] = [];
  
  if (newDate) {
    if (oldDate) {
      // Replace ALL occurrences of the extracted old date in the document
      dateBoxes = findTextBBoxes(items, oldDate);
    }
    
    // Fallback: If no exact matches were found, try finding the date next to a label
    if (dateBoxes.length === 0) {
      const labeledDateBox = findValueAfterLabel(items, DATE_LABEL_PATTERN);
      if (labeledDateBox) {
         dateBoxes = [labeledDateBox];
      }
    }
  }

  const titleBox = (convertTitle !== false) ? findTitleBBox(items) : null;
  const invoiceNoBox = newInvoiceNo ? findValueAfterLabel(items, INVOICE_NO_LABEL_PATTERN) : null;
  const receiptNoBox = newReceiptNo ? findValueAfterLabel(items, RECEIPT_NO_LABEL_PATTERN) : null;
  const dueDateBox = newDueDate ? findValueAfterLabel(items, DUE_DATE_LABEL_PATTERN) : null;
  const datePaidBox = newDatePaid ? findValueAfterLabel(items, DATE_PAID_LABEL_PATTERN) : null;

  const pdfLibDoc = await PDFDocument.load(originalPdfBuffer);
  pdfLibDoc.registerFontkit(fontkit);
  const thaiFont = await pdfLibDoc.embedFont(thaiFontBytes, { subset: true });
  const thaiBoldFont = await pdfLibDoc.embedFont(thaiBoldFontBytes, { subset: true });
  const monoFont = await pdfLibDoc.embedFont(StandardFonts.Helvetica);
  const boldMonoFont = await pdfLibDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfLibDoc.getPages()[0]!;

  const isThaiText = (t: string) => /[ก-๙]/u.test(t);
  const pickFont = (t: string) => isThaiText(t) ? thaiFont : monoFont;
  const pickBoldFont = (t: string) => isThaiText(t) ? thaiBoldFont : boldMonoFont;

  // Replace dates
  for (const box of dateBoxes) {
    const fontSize = Math.max(9, Math.round(box.height * 0.9));
    page.drawRectangle({ x: box.x - 2, y: box.y - 2, width: box.width + 8, height: box.height + 4, color: rgb(1, 1, 1) });
    page.drawText(newDate!, { x: box.x, y: box.y + 1, size: fontSize, font: monoFont, color: rgb(0.25, 0.25, 0.25) });
  }

  // Replace title
  let titleConverted = false;
  if (convertTitle && titleBox) {
    const titleFontSize = Math.max(18, Math.round(titleBox.height * 1.05));
    // Expand the mask width significantly so long previous titles are completely erased
    page.drawRectangle({ x: titleBox.x - 4, y: titleBox.y - 4, width: titleBox.width + 300, height: titleBox.height + 8, color: rgb(1, 1, 1) });
    
    // Draw text twice with a slight offset to create an "extra thick" fake-bold effect
    page.drawText(newTitleText, { x: titleBox.x, y: titleBox.y, size: titleFontSize, font: thaiBoldFont, color: rgb(0, 0, 0) });
    page.drawText(newTitleText, { x: titleBox.x + 0.3, y: titleBox.y, size: titleFontSize, font: thaiBoldFont, color: rgb(0, 0, 0) });
    
    titleConverted = true;
  }

  // Replace invoice number
  let invoiceNoFixed = false;
  if (newInvoiceNo && invoiceNoBox) {
    const fontSize = Math.max(10, Math.round(invoiceNoBox.height * 1.0));
    page.drawRectangle({ x: invoiceNoBox.x - 2, y: invoiceNoBox.y - 2, width: invoiceNoBox.width + 8, height: invoiceNoBox.height + 4, color: rgb(1, 1, 1) });
    page.drawText(newInvoiceNo, { x: invoiceNoBox.x, y: invoiceNoBox.y + 1, size: fontSize, font: pickFont(newInvoiceNo), color: rgb(0.2, 0.2, 0.2) });
    invoiceNoFixed = true;
  } else if (newInvoiceNo && !invoiceNoBox) {
    throw new Error('Invoice number label not found in PDF. Expected: เลขที่, Invoice number, etc.');
  }

  // Replace receipt number
  let receiptNoFixed = false;
  if (newReceiptNo && receiptNoBox) {
    const fontSize = Math.max(9, Math.round(receiptNoBox.height * 0.9));
    page.drawRectangle({ x: receiptNoBox.x - 2, y: receiptNoBox.y - 2, width: receiptNoBox.width + 8, height: receiptNoBox.height + 4, color: rgb(1, 1, 1) });
    page.drawText(newReceiptNo, { x: receiptNoBox.x, y: receiptNoBox.y + 1, size: fontSize, font: pickFont(newReceiptNo), color: rgb(0.2, 0.2, 0.2) });
    receiptNoFixed = true;
  } else if (newReceiptNo && !receiptNoBox) {
    throw new Error('Receipt number label not found in PDF. Expected: Receipt number, เลขที่ใบเสร็จ, etc.');
  }

  // Replace due date
  let dueDateFixed = false;
  if (newDueDate && dueDateBox) {
    const fontSize = Math.max(9, Math.round(dueDateBox.height * 0.9));
    page.drawRectangle({ x: dueDateBox.x - 2, y: dueDateBox.y - 2, width: dueDateBox.width + 8, height: dueDateBox.height + 4, color: rgb(1, 1, 1) });
    page.drawText(newDueDate, { x: dueDateBox.x, y: dueDateBox.y + 1, size: fontSize, font: monoFont, color: rgb(0.25, 0.25, 0.25) });
    dueDateFixed = true;
  } else if (newDueDate && !dueDateBox) {
    throw new Error('Due date label not found in PDF. Expected: วันที่ครบกำหนด, Due Date, etc.');
  }

  // Replace date paid
  let datePaidFixed = false;
  if (newDatePaid && datePaidBox) {
    const fontSize = Math.max(9, Math.round(datePaidBox.height * 0.9));
    page.drawRectangle({ x: datePaidBox.x - 2, y: datePaidBox.y - 2, width: datePaidBox.width + 8, height: datePaidBox.height + 4, color: rgb(1, 1, 1) });
    page.drawText(newDatePaid, { x: datePaidBox.x, y: datePaidBox.y + 1, size: fontSize, font: monoFont, color: rgb(0.25, 0.25, 0.25) });
    datePaidFixed = true;
  } else if (newDatePaid && !datePaidBox) {
    throw new Error('Date paid label not found in PDF. Expected: Date paid, วันที่ชำระ, etc.');
  }

  // Replace top-right logo
  let logoFixed = false;
  if (newLogoPath) {
    try {
      const logoBytes = await fs.readFile(newLogoPath);
      const isJpeg = /\.(jpg|jpeg)$/i.test(newLogoPath);
      const image = isJpeg
        ? await pdfLibDoc.embedJpg(logoBytes)
        : await pdfLibDoc.embedPng(logoBytes);

      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const margin = 20;
      const logoW = pageWidth * 0.10;
      const logoH = pageHeight * 0.05;
      const logoX = pageWidth - logoW - margin;
      // Subtract an extra 10 points from the top to move the logo down (moved up slightly from 20)
      const logoY = pageHeight - logoH - margin - 10;

      page.drawRectangle({ x: logoX - 4, y: logoY - 4, width: logoW + 8, height: logoH + 8, color: rgb(1, 1, 1) });

      const scale = Math.min(logoW / image.width, logoH / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      page.drawImage(image, {
        x: logoX + (logoW - drawW) / 2,
        y: logoY + (logoH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
      logoFixed = true;
    } catch (err) {
      throw new Error(`Cannot load logo image at "${newLogoPath}": ${err instanceof Error ? err.message : err}`);
    }
  }

  let linesDrawn = false;
  if (drawLine) {
    const drawLineAboveLabel = (labelPattern: RegExp) => {
      const rows = buildRows(items);
      const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
      for (const rowY of sortedYs) {
        const rowItems = rows.get(rowY)!;
        if (rowItems.some(i => labelPattern.test(i.str))) {
          // Found the label. Draw a line above it.
          // Add a bit of padding above the text
          const lineY = rowY + 12; 
          const pageWidth = page.getWidth();
          const margin = 30; // Left and right margin
          page.drawLine({
            start: { x: margin, y: lineY },
            end: { x: pageWidth - margin, y: lineY },
            thickness: 1,
            color: rgb(0, 0, 0),
          });
          linesDrawn = true;
          break; // Draw once per label type
        }
      }
    };

    // Draw above Description
    drawLineAboveLabel(/Description/ui);
    // Draw above Payment method
    drawLineAboveLabel(/Payment method/ui);
  }

  const fixedPdfBuffer = Buffer.from(await pdfLibDoc.save());
  const fixedFileName = buildFixedFileName(originalFileName);

  return {
    fixedPdfBuffer,
    fixedFileName,
    clientName,
    ...(originalDate !== undefined ? { originalDate } : {}),
    ...(oldDate !== undefined ? { oldDate } : {}),
    replacedCount: dateBoxes.length,
    titleConverted,
    invoiceNoFixed,
    receiptNoFixed,
    dueDateFixed,
    datePaidFixed,
    logoFixed,
    linesDrawn,
  };
};
