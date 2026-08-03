import { describe, expect, it } from '@jest/globals';
import { locateAddressBox, type PdfTextItem } from '../services/pdfReceiptService.js';
import { extractClientNameFromText, type TextLine } from '../utils/receiptHelpers.js';

const makeRawItem = (str: string, x: number, y: number, width = 5, height = 9): PdfTextItem => ({
  str,
  transform: [1, 0, 0, 1, x, y],
  width,
  height,
});

describe('extractClientNameFromText', () => {
  it('derives the Drive client name from the corrected address, not stale PDF text', () => {
    const correctedAddress = [
      'บริษัท ตัวอย่าง จำกัด',
      '99/1 อาคารตัวอย่าง ชั้น 10',
      'ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
      'TH VAT 0000000000000',
    ].join('\n');

    expect(extractClientNameFromText(correctedAddress)).toBe('บริษัท ตัวอย่าง');
  });
});

describe('locateAddressBox', () => {
  it('finds the address section when the bill-to header is split across raw glyphs', () => {
    const lines: TextLine[] = [
      { text: 'Invoice', x: 40, y: 740, width: 50, height: 18 },
      { text: 'Bill to', x: 250, y: 660, width: 40, height: 9 },
      { text: 'Original Customer', x: 250, y: 642, width: 80, height: 9 },
      { text: '123 Old Street', x: 250, y: 628, width: 70, height: 9 },
      { text: 'Bangkok 10110', x: 250, y: 614, width: 70, height: 9 },
    ];

    const rawItems: PdfTextItem[] = [
      makeRawItem('I', 40, 740),
      makeRawItem('n', 45, 740),
      makeRawItem('v', 50, 740),
      makeRawItem('B', 250, 660),
      makeRawItem('i', 256, 660),
      makeRawItem('l', 259, 660),
      makeRawItem('l', 262, 660),
      makeRawItem('t', 268, 660),
      makeRawItem('o', 272, 660),
      makeRawItem('Original Customer', 250, 642, 80),
      makeRawItem('123 Old Street', 250, 628, 70),
      makeRawItem('Bangkok 10110', 250, 614, 70),
    ];

    const addressData = locateAddressBox(lines, rawItems);

    expect(addressData).not.toBeNull();
    expect(addressData?.headerLabel).toBe('Bill to');
    expect(addressData?.extractedText).toContain('Original Customer');
    expect(addressData?.extractedText).toContain('123 Old Street');
  });

  it('reports a headerTop above the mask box, so the old header gets fully covered', () => {
    // Regression: the mask box deliberately stops below the header baseline, and
    // the drawer used to extend it by a hardcoded +10pt. When the original label
    // was taller than that guess, the top of the old "Bill to" survived behind
    // the redrawn one. headerTop must clear the label's full glyph height.
    const headerBaseline = 660;
    const headerHeight = 14; // taller than the old hardcoded 10pt extension

    const lines: TextLine[] = [
      { text: 'Bill to', x: 250, y: headerBaseline, width: 40, height: headerHeight },
      { text: 'Original Customer', x: 250, y: 642, width: 80, height: 9 },
      { text: '123 Old Street', x: 250, y: 628, width: 70, height: 9 },
    ];

    const rawItems: PdfTextItem[] = [
      makeRawItem('Bill to', 250, headerBaseline, 40, headerHeight),
      makeRawItem('Original Customer', 250, 642, 80),
      makeRawItem('123 Old Street', 250, 628, 70),
    ];

    const addressData = locateAddressBox(lines, rawItems);
    expect(addressData).not.toBeNull();

    const box = addressData!.combinedBox;
    const headerTop = addressData!.headerTop;

    // The located box alone does not reach the header...
    expect(box.y + box.height).toBeLessThan(headerBaseline);
    // ...so headerTop must clear the top of the original glyphs.
    expect(headerTop).toBeGreaterThanOrEqual(headerBaseline + headerHeight);
    // And a mask drawn to headerTop must be taller than the box itself.
    expect(headerTop - box.y).toBeGreaterThan(box.height);
  });
});
