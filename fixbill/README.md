# fixbill

Fixes billing addresses, dates, invoice numbers, and logos on Thai PDF receipts and invoices, then saves to Google Drive.

## What it does

Wraps the local `fixbill` CLI to rewrite PDF fields. You provide a PDF and what to fix (address, issue date, invoice number, receipt number, due date, date paid, or logo). The skill structures the input, runs the CLI (which handles Thai font embedding), saves the fixed PDF locally to `~/Downloads`, then uploads both the fixed and original PDFs to Google Drive in dated folders.

## Example

**You type:**
```
/fixbill
<drop a PDF>
Fix the address to:
บริษัท ตัวอย่าง จำกัด
123 ถ.สุขุมวิท
เขตพระแก้ว กทม. 10110
TH VAT 0000000000000
```

**What happens:**

1. Skill structures the address into clean lines.
2. Runs: `fixbill "/path/to/receipt.pdf" "บริษัท ตัวอย่าง จำกัด\n123 ถ.สุขุมวิท\nเขตพระแก้ว กทม. 10110\nTH VAT 0000000000000"`
3. CLI saves to `~/Downloads/receipt_edit.pdf`.
4. Skill uploads both PDFs to `fixbill/<client>/<date>-edit-<client>.pdf` and `<date>-original-<client>.pdf` on Google Drive.
5. Reports local path and Drive links.

Supports: address, date (DD/MM/YYYY), invoice number, receipt number, due date, date paid, logo replacement, separator lines. Flags combine in one pass.

## Setup

Requires the separate `fixbill-cli` tool from https://github.com/iampon-p/fixbill-cli. Install it first, then run `fixbill doctor` to verify setup.

## Install

```bash
cp -r fixbill ~/.claude/skills/
```
