import type { PDFFont } from 'pdf-lib';

export type TextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const THAI_CORPORATE_SUFFIXES = [
  /\s+จำกัด(?:\s*\(มหาชน\))?$/u,
  /\s+co\.?\s*,?\s*ltd\.?$/i,
  /\s+ltd\.?$/i,
  /\s+limited$/i,
];

const BILL_TO_PATTERN = /(?:bill|invoice|customer|sold)\s*(?:to|address)|ลูกค้า[:\s]?|ผู้ซื้อ[:\s]?/ui;
const ADDRESS_STOP_PATTERN = /^(?:invoice\s*no\.?|date|total|subtotal|ship\s*to|due\s*date|page\s+\d+|reference|no\b\.?|payment|terms|รายการ|ผู้ขาย)/i;

export const DATE_LABEL_PATTERN = /(?:Date(?:\s*paid|\s*issued)?|วันที่(?:ออก(?:บิล)?|ชำระ)?|Issue\s*Date)[\s:]*/ui;

export const INVOICE_NO_LABEL_PATTERN =
  /เลขที่(?:ใบเสนอราคา|ใบแจ้งหนี้|ใบส่งของ|บิล)?[:\s]*|Invoice\s*(?:number|No\.?|#)[:\s]*|Document\s*No\.?[:\s]*|No\.[:\s]*/ui;

export const DUE_DATE_LABEL_PATTERN =
  /(?:วันที่)?ครบกำา?หนด(?:ชำา?ระ)?[:\s]*|กำา?หนดชำา?ระ[:\s]*|Due\s*Date[:\s]*|Payment\s*Due[:\s]*|\bDue\b[:\s]*|Terms[:\s]*/ui;

export const DATE_PAID_LABEL_PATTERN =
  /Date\s*paid[:\s]*|วันที่ชำา?ระ[:\s]*/ui;

export const ISSUER_LABEL_PATTERN =
  /ผู้ขาย[:\s]*|ออกโดย[:\s]*|From[:\s]*|Issued\s*by[:\s]*/ui;

export const ISSUER_STOP_PATTERN =
  /ลูกค้า[:\s]?|ผู้ซื้อ[:\s]?|Bill\s*to|Invoice\s*to/ui;

export const RECEIPT_NO_LABEL_PATTERN =
  /Receipt\s*(?:number|No\.?)[:\s]*|เลขที่ใบเสร็จ(?:รับเงิน)?[:\s]*/ui;

const GARBLED_DETECTION_PATTERN = /[ุยญ็ฺ๊๋ํ๎๏๚๛๐๐๑๒๓๔๕๖๗๘๙๚๛]/u;
const GARBLED_THRESHOLD = 3;

const detectGarbledText = (text: string): boolean => {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return false;
  
  let suspiciousCount = 0;
  for (const line of lines) {
    if (GARBLED_DETECTION_PATTERN.test(line) && !line.includes('บริษัท') && !line.includes('จำกัด')) {
      const thaiChars = line.match(/[ุยญ็ฺ๊๋ํ๎๏๚๛๐๑๒๓๔๕๖๗๘๙๚๛]/gu);
      if (thaiChars && thaiChars.length >= GARBLED_THRESHOLD) {
        suspiciousCount++;
      }
    }
  }
  
  return suspiciousCount >= 2;
};

export const isAlreadyFixedDocument = (fileName?: string, extractedText?: string): boolean => {
  if (fileName && /[-_]?(fix|fixed|fixbill)/i.test(fileName)) {
    return true;
  }
  
  if (extractedText && detectGarbledText(extractedText)) {
    return true;
  }
  
  return false;
};

export const normalizeWhitespace = (value: string): string => value.replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

export const buildFixedFileName = (originalFileName: string): string => {
  const extensionIndex = originalFileName.lastIndexOf('.');
  const extension = extensionIndex >= 0 ? originalFileName.slice(extensionIndex) : '.pdf';
  const baseName = extensionIndex >= 0 ? originalFileName.slice(0, extensionIndex) : originalFileName;
  const strippedCopyCount = baseName.replace(/\s*\(\d+\)$/, '');
  const normalizedBase = strippedCopyCount.endsWith('_1') ? strippedCopyCount : `${strippedCopyCount}_1`;

  return `${normalizedBase}${extension}`;
};

const stripCorporateSuffix = (value: string): string => {
  let result = normalizeWhitespace(value);
  for (const suffixPattern of THAI_CORPORATE_SUFFIXES) {
    result = result.replace(suffixPattern, '');
  }

  return result.replace(/[,:;\-]+$/u, '').trim();
};

export const extractClientNameFromText = (text: string, fileName?: string): string => {
  const normalizedText = text.replace(/\r/g, '\n');
  
  const cleanDuplicateLines = (inputText: string): string => {
    const lines = inputText.split('\n');
    const cleaned: string[] = [];
    let prevLine = '';
    
    for (const line of lines) {
      const trimmed = normalizeWhitespace(line);
      if (!trimmed) continue;
      if (trimmed !== prevLine) {
        cleaned.push(trimmed);
        prevLine = trimmed;
      }
    }
    return cleaned.join('\n');
  };
  
  const textToProcess = isAlreadyFixedDocument(fileName, normalizedText) ? cleanDuplicateLines(normalizedText) : normalizedText;
  const billToBlock = textToProcess.match(/bill\s*to[\s\S]*?(?=\n(?:ship to|invoice|tax id|vat|date|subtotal|total|due date)\b|$)/i)?.[0] ?? textToProcess;
  const lines = billToBlock.split('\n').map((line) => normalizeWhitespace(line)).filter(Boolean);
  
  for (const line of lines) {
    if (BILL_TO_PATTERN.test(line)) {
      const nameOnSameLine = line.replace(BILL_TO_PATTERN, '').replace(/^[:\s\-]+/, '').trim();
      if (nameOnSameLine && !ADDRESS_STOP_PATTERN.test(nameOnSameLine)) {
        return stripCorporateSuffix(nameOnSameLine);
      }
      continue;
    }
    if (!ADDRESS_STOP_PATTERN.test(line)) {
      return stripCorporateSuffix(line);
    }
  }

  const thaiMatch = textToProcess.match(/บริษัท[^\n]+/u);
  if (thaiMatch?.[0]) {
    return stripCorporateSuffix(thaiMatch[0]);
  }

  return 'Unknown Client';
};

export const extractOriginalDateFromText = (text: string): string => {
  const normalizedText = text.replace(/\r/g, '\n');
  const patterns = [
    /\b\d{2}[/-]\d{2}[/-]\d{4}\b/,
    /\b\d{4}[/-]\d{2}[/-]\d{2}\b/,
    /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/, // Month DD, YYYY
    /\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/, // DD Month YYYY
    /\b\d{1,2}\s+[ก-๙]{3,}\s+\d{4}\b/u,
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match?.[0]) {
      return match[0];
    }
  }

  return new Date().toLocaleDateString('en-GB');
};

const segmentText = (text: string): string[] => {
  const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
  if (!segmenter) {
    return Array.from(text);
  }

  return Array.from(segmenter.segment(text), (segment) => segment.segment);
};

export const wrapTextByWidth = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const normalizedParagraph = paragraph.replace(/\s+/g, ' ').trim();

    if (!normalizedParagraph) {
      lines.push('');
      continue;
    }

    let currentLine = '';
    for (const segment of segmentText(normalizedParagraph)) {
      const nextLine = `${currentLine}${segment}`;
      if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth || !currentLine) {
        currentLine = nextLine;
        continue;
      }

      lines.push(currentLine.trim());
      currentLine = segment.trimStart();
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  }

  return lines;
};

export const shouldStopAtLine = (lineText: string): boolean => ADDRESS_STOP_PATTERN.test(lineText);

export const isBillToLine = (lineText: string): boolean => BILL_TO_PATTERN.test(lineText);

export const findBillToLine = (lines: TextLine[]): TextLine | null =>
  lines.find((line) => isBillToLine(normalizeWhitespace(line.text))) ?? null;
