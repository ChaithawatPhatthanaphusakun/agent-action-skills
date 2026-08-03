import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import pdfParse from 'pdf-parse';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getServerEnv } from '../config/env.js';
import {
  buildFixedFileName,
  extractClientNameFromText,
  extractOriginalDateFromText,
  isBillToLine,
  findBillToLine,
  normalizeWhitespace,
  shouldStopAtLine,
  wrapTextByWidth,
  type TextLine,
} from '../utils/receiptHelpers.js';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

export type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

export type LocatedBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProcessReceiptPdfInput = {
  originalPdfBuffer: Buffer;
  originalFileName: string;
  correctedDetails: string;
};

export type ProcessReceiptPdfOutput = {
  fixedPdfBuffer: Buffer;
  fixedFileName: string;
  clientName: string;
  originalDate: string;
  originalAddress: string;
  originalText: string;
  addressBox?: LocatedBox;
};

const loadPdfJs = async (): Promise<PdfJsModule> => import('pdfjs-dist/legacy/build/pdf.mjs');

const loadThaiFontBytes = async (): Promise<Uint8Array> => {
  const serverEnv = getServerEnv();
  const configuredPath = serverEnv.THAI_FONT_PATH?.trim();
  
  const resolvedFontPath = configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts/NotoSansThai-Regular.ttf');

  try {
    return await fs.readFile(resolvedFontPath);
  } catch (error) {
    throw new Error(`Unable to load a Thai-supporting font at ${resolvedFontPath}. Set THAI_FONT_PATH to a valid TTF file.`);
  }
};

const buildTextLines = (items: PdfTextItem[]): TextLine[] => {
  const rows = new Map<number, PdfTextItem[]>();
  
  for (const item of items) {
    const text = item.str ?? '';
    if (!text.trim() && text !== ' ') continue;
    
    const y = Number(item.transform[5]);
    let foundY = Array.from(rows.keys()).find(ry => Math.abs(ry - y) <= 2.5);
    
    if (foundY === undefined) {
      rows.set(y, [item]);
    } else {
      rows.get(foundY)?.push(item);
    }
  }

  const lines: TextLine[] = [];

  for (const [y, rowItems] of rows.entries()) {
    // Sort items in row by X
    rowItems.sort((a, b) => Number(a.transform[4]) - Number(b.transform[4]));
    
    let currentLine: TextLine | null = null;

    for (const item of rowItems) {
      const text = item.str;
      const x = Number(item.transform[4]);
      const width = Number(item.width);
      const height = Number(item.height);

      if (!currentLine) {
        currentLine = { text, x, y, width, height };
        continue;
      }

      const horizontalGap = x - (currentLine.x + currentLine.width);
      
      // If gap is large (> 3x height), start a new line (separate column)
      if (horizontalGap > currentLine.height * 3.0) {
        lines.push(currentLine);
        currentLine = { text, x, y, width, height };
        continue;
      }

      // If gap is significant (> 0.2x height), add a space
      const joiner = (horizontalGap > currentLine.height * 0.18) ? ' ' : '';
      
      // Update current line
      currentLine.text = `${currentLine.text}${joiner}${text}`;
      currentLine.width = (x + width) - currentLine.x;
      currentLine.height = Math.max(currentLine.height, height);
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.sort((left, right) => right.y - left.y || left.x - right.x);
};

export type LocatedAddress = {
  boxes: LocatedBox[];
  combinedBox: LocatedBox;
  extractedText: string;
  headerLabel: string;
  isThaiFormat: boolean;
  /**
   * Top edge (PDF units, y grows upward) of the original "Bill to" / "ลูกค้า:"
   * label, including its ascenders. The mask must reach at least this high or
   * the top of the old label survives behind the redrawn one.
   */
  headerTop: number;
};

export const locateAddressBox = (lines: TextLine[], rawItems: PdfTextItem[]): LocatedAddress | null => {
  const billToLine = findBillToLine(lines);
  if (!billToLine) {
    return null;
  }
  const isThaiFormat = /[ก-๙]/u.test(billToLine.text);
  const headerLabel = isThaiFormat ? 'ลูกค้า:' : 'Bill to';

  const billToX = billToLine.x;
  const billToY = billToLine.y;

  // Filter items that are strictly BELOW "Bill to"
  // We use a safe vertical margin (3.0 units) to avoid catching parts of the "Bill to" line
  const belowItems = rawItems
    .filter((item) => {
      const x = Number(item.transform[4] ?? 0);
      const y = Number(item.transform[5] ?? 0);
      const text = normalizeWhitespace(item.str ?? '');
      
      const isBelow = y < billToY - 3.0;
      
      // We only look for items that are roughly aligned with "Bill to" or to its right,
      // and strictly below it.
      return text && x >= billToX - 20 && isBelow;
    })
    .sort((a, b) => Number(b.transform[5]) - Number(a.transform[5]));

  const sectionItems: PdfTextItem[] = [];
  let prevY: number | null = null;

  for (const item of belowItems) {
    const y = Number(item.transform[5] ?? 0);
    const text = normalizeWhitespace(item.str ?? '');

    if (shouldStopAtLine(text)) break;
    
    // If there is a huge gap (> 40 units), it's probably not part of the address anymore
    if (prevY !== null && prevY - y > 40) break;

    sectionItems.push(item);
    prevY = y;
  }

  if (!sectionItems.length) {
    return null;
  }

  const boxes: LocatedBox[] = [];

  const xs = sectionItems.map(i => Number(i.transform[4]));
  const rights = sectionItems.map(i => Number(i.transform[4]) + Number(i.width));
  const ys = sectionItems.map(i => Number(i.transform[5]));
  const tops = sectionItems.map(i => Number(i.transform[5]) + Number(i.height));

  // Create the masking box for items below
  // We ensure the top of the mask is strictly below the "Bill to" baseline
  const maxItemTop = Math.max(...tops);
  const safeTop = Math.min(maxItemTop + 4, billToY - 2.5);

  boxes.push({
    x: Math.min(...xs) - 4,
    y: Math.min(...ys) - 4,
    width: Math.max(...rights) - Math.min(...xs) + 8,
    height: safeTop - (Math.min(...ys) - 4),
  });

  const combinedBox = boxes[0]!;

  const minY = Math.min(...ys);
  const maxY = Math.max(...tops);

  const extractedText = lines
    .filter((l) => {
      const centerY = l.y + l.height / 2;
      const horizontalMatch = l.x >= combinedBox.x - 60;
      const verticalMatch = centerY >= minY - 8 && centerY <= maxY + 8;
      return horizontalMatch && verticalMatch;
    })
    .map((l) => l.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  // Include company name that appears on the same row as the bill-to label.
  // pdfjs gives each word/cluster as a separate item; buildTextLines merges the same row.
  // The merged TextLine for the bill-to row contains "ลูกค้า: บริษัท XYZ จำกัด".
  const billToRowY = billToLine.y;
  const billToTextLine = lines
    .filter(l => Math.abs(l.y - billToRowY) <= 2.5)
    .find(l => isBillToLine(normalizeWhitespace(l.text)));
  const rowText = billToTextLine ? normalizeWhitespace(billToTextLine.text) : '';
  const inlineName = rowText
    .replace(/(?:bill|invoice|customer|sold)\s*(?:to|address)|ลูกค้า[:\s]?|ผู้ซื้อ[:\s]?/ui, '')
    .replace(/^[:\s\-]+/, '')
    .trim();

  const finalExtractedText = [inlineName, extractedText].filter(Boolean).join('\n').trim();

  // Top of the original header glyphs (+2 pt of slack for ascenders that
  // overshoot the reported line height). The drawer masks up to this line.
  const headerTop = billToLine.y + billToLine.height + 2;

  return {
    boxes,
    combinedBox,
    extractedText: finalExtractedText,
    headerLabel,
    headerTop,
    isThaiFormat,
  };
};

const fitTextToBox = (text: string, font: Awaited<ReturnType<PDFDocument['embedFont']>>, maxWidth: number, maxHeight: number) => {
  let fontSize = 11;
  let lines = wrapTextByWidth(text, font, fontSize, maxWidth);
  let lineHeight = fontSize * 1.22;

  while (fontSize > 7.5 && lines.length * lineHeight > maxHeight) {
    fontSize -= 0.5;
    lines = wrapTextByWidth(text, font, fontSize, maxWidth);
    lineHeight = fontSize * 1.22;
  }

  return { fontSize, lines, lineHeight };
};

const extractFirstPageText = async (pdfJs: PdfJsModule, pdfBuffer: Buffer): Promise<{ fullText: string; lines: TextLine[]; rawItems: PdfTextItem[] }> => {
  const parsedPdf = await pdfParse(pdfBuffer);
  const loadingTask = pdfJs.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 });
  const pdfDocument = await loadingTask.promise;

  if (pdfDocument.numPages < 1) {
    throw new Error('The uploaded PDF does not contain any pages.');
  }

  const firstPage = await pdfDocument.getPage(1);
  const textContent = await firstPage.getTextContent();
  const textItems = (textContent.items as PdfTextItem[]).filter((item) => Boolean(normalizeWhitespace(item.str ?? '')));
  const lines = buildTextLines(textItems);
  const fullText = normalizeWhitespace(parsedPdf.text || lines.map((line) => line.text).join('\n'));

  return { fullText, lines, rawItems: textItems };
};

export const processReceiptPdf = async ({
  originalPdfBuffer,
  originalFileName,
  correctedDetails,
}: ProcessReceiptPdfInput): Promise<ProcessReceiptPdfOutput> => {
  const pdfJs = await loadPdfJs();
  const thaiFontBytes = await loadThaiFontBytes();
  const extracted = await extractFirstPageText(pdfJs, originalPdfBuffer);
  const originalDate = extractOriginalDateFromText(extracted.fullText);
  const fixedFileName = buildFixedFileName(originalFileName);
  const pdfDocument = await PDFDocument.load(originalPdfBuffer);
  const pages = pdfDocument.getPages();

  if (!pages.length) {
    throw new Error('The uploaded PDF does not contain any pages.');
  }

  pdfDocument.registerFontkit(fontkit);
  const thaiFont = await pdfDocument.embedFont(thaiFontBytes, { subset: true });
  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const firstPage = pages[0];
  if (!firstPage) {
    throw new Error('The uploaded PDF does not contain a first page.');
  }

  const addressData = locateAddressBox(extracted.lines, extracted.rawItems);

  if (!addressData) {
    throw new Error('Unable to locate the customer address section (Bill to / ลูกค้า:) in the uploaded PDF.');
  }

  const { boxes: addressBoxes, combinedBox: addressBox, extractedText: originalAddress, headerLabel, isThaiFormat, headerTop } = addressData;
  // Derive the client name from the NEW corrected address the caller passed in.
  // The old PDF text layer (`originalAddress` / `extracted.fullText`) is frequently
  // garbled, which produced wrong client/folder names. Fall back to the old text
  // only when no corrected address was provided.
  const clientName = extractClientNameFromText(correctedDetails || originalAddress || extracted.fullText);

  // Expand innerWidth massively so text-wrapping algorithm doesn't break lines like '10400'
  const innerWidth = Math.max(24, addressBox.width + 100); 
  const innerHeight = Math.max(24, addressBox.height - 8);
  const fittedText = fitTextToBox(correctedDetails, thaiFont, innerWidth, innerHeight);  const textHeight = fittedText.lines.length * fittedText.lineHeight;
  const startY = addressBox.y + addressBox.height - fittedText.fontSize - Math.max(2, (addressBox.height - textHeight) / 2);

  // Calculate header position from top of box
  const headerY = addressBox.y + addressBox.height - 2;

  // Step 1: Expand mask to cover ENTIRE block including header.
  // `locateAddressBox` deliberately stops the box below the header baseline, so
  // the mask must be extended upward to `headerTop` — the measured top of the
  // original label. A fixed offset here leaves the top of the old label visible
  // whenever its font is larger than the guess.
  for (const box of addressBoxes) {
    firstPage.drawRectangle({
      x: box.x,
      y: box.y, // Full height including header area
      width: box.width + 60, // Expand width heavily to prevent text wrapping cutoff
      height: Math.max(box.height, headerTop - box.y),
      color: rgb(1, 1, 1),
    });
  }

  // Step 2: Redraw address header at top
  firstPage.drawText(headerLabel, {
    x: addressBox.x + 4,
    y: headerY,
    size: 11,
    font: isThaiFormat ? thaiFont : boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });

  // Step 3: Draw the provided text directly below the header
  firstPage.drawText(fittedText.lines.join('\n'), {
    x: addressBox.x + 4,
    y: headerY - 14,
    size: 9.5,
    font: thaiFont,
    color: rgb(0.08, 0.12, 0.18),
    lineHeight: 12,
  });

  const fixedPdfBuffer = Buffer.from(await pdfDocument.save());

  return {
    fixedPdfBuffer,
    fixedFileName,
    clientName,
    originalDate,
    originalAddress,
    originalText: extracted.fullText,
    addressBox,
  };
};
