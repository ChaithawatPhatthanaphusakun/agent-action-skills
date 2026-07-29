---
name: fixbill
description: Use whenever the user wants to fix a billing address, issue date, invoice number, receipt number, due date, date paid, document title, or logo on a PDF receipt or invoice — especially Thai-language receipts. Trigger when the user drops a PDF and mentions "fix address", "wrong address", "fix date", "fix invoice number", "fix receipt number", "fix due date", "fix date paid", "fix issuer", "change title", "change logo", "correct bill", "fixbill", or types /fixbill. Wraps the local fixbill CLI.
---

# fixbill

You are running the FixBill workflow. Your job is to gather inputs, invoke the local `fixbill` CLI to produce a fixed PDF, then save it to Google Drive yourself using your Drive connector.

The CLI does the PDF work (masking + Thai-font redraw) and saves locally to `~/Downloads` — nothing else. It has no Google Drive integration of its own. **You are the Drive integration**: after the CLI succeeds, you use your own Google Drive connector tool (Claude's `Google Drive` MCP tools, or Codex's `google drive_*` connector tools) to upload the fixed PDF. This only happens when you (Claude or Codex) run the command — a bare terminal invocation of `fixbill` never touches Drive, because the Drive connector only exists inside an LLM CLI session.

## Updating

Never auto-update. If the CLI prints a notice that a newer version is available, tell the user they can run `fixbill update` themselves — do not run it for them unless they explicitly ask.

## Modes

| User wants to fix | Command |
|---|---|
| Verify setup | `fixbill doctor` |
| Customer address (Bill-to block) | `fixbill "<path>" "<new-address>"` |
| Issue date only | `fixbill "<path>" "DD/MM/YYYY"` |
| Title only (no date needed) | `fixbill "<path>" --title "<new-title>"` |
| Invoice number | `fixbill "<path>" --invoice "<new-no>"` |
| Receipt number | `fixbill "<path>" --receipt "<new-no>"` |
| Payment due date | `fixbill "<path>" --due "DD/MM/YYYY"` |
| Date paid | `fixbill "<path>" --date-paid "<value>"` |
| Top-right logo | `fixbill "<path>" --logo <image-path>` |
| Draw separator lines | `fixbill "<path>" --line` |
| Multiple fields at once | combine any flags above |

**Note:** `--invoice`, `--receipt`, `--due`, and `--date-paid` only work when the PDF already has that label printed on it.

## Inputs you need

**Address mode:** PDF path + the full corrected address string — **structured with newlines** (see below).

**Date mode:** PDF path + new date in DD/MM/YYYY. CLI finds and replaces all date occurrences automatically.

**Title:** `--title "<new-title>"` — replaces document title (e.g. ใบเสนอราคา → ใบแจ้งหนี้). No date required.

**Invoice number:** `--invoice "<value>"` — replaces the value after เลขที่, Invoice number, etc.

**Receipt number:** `--receipt "<value>"` — replaces the value after เลขที่ใบเสร็จ, Receipt number, etc.

**Due date:** `--due "DD/MM/YYYY"` — replaces the value after วันที่ครบกำหนด, Due Date, etc.

**Date paid:** `--date-paid "<value>"` — replaces the value after Date paid, วันที่ชำระ, etc.

**Logo:** `--logo <path-to-image>` — replaces the top-right logo area with a PNG or JPEG image.

**Line:** `--line` — draws horizontal separation lines above the "Description" and "Payment method" sections.

**Flags are combinable.** You can run multiple fixes in one command.

If any required input is missing, ask once. Don't ask for old values — the CLI finds them automatically.

## Address Structuring (for address mode only)

Claude/Codex acts as the address layout layer. If the user drops a PDF in Claude/Codex and pastes a single-line unstructured address, **structure it before calling the CLI** — otherwise Thai text wraps at the character level mid-word.

The terminal CLI does not understand address context or infer row breaks. It renders each `\n`-separated line as its own row, so direct terminal users must provide the address in the exact structure they want printed.

**Detect unstructured input:** no `\n` present AND the string contains both a company name and a tax ID.

**Structure rules:**
1. Company name → line 1 (บริษัท … จำกัด / ห้างหุ้นส่วน / ชื่อบุคคล)
2. Building number + street → line 2
3. District / province / postal code → line 3
4. Tax ID → line 4 (TH VAT … / เลขประจำตัวผู้เสียภาษี …)

**Example — unstructured input from user:**
```
บริษัท ตัวอย่าง จำกัด 99/1 อาคารตัวอย่าง ชั้น 10 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110 TH VAT 0000000000000
```

**Structured output to pass to CLI:**
```
บริษัท ตัวอย่าง จำกัด
99/1 อาคารตัวอย่าง ชั้น 10
ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110
TH VAT 0000000000000
```

For direct terminal use, pre-structure the address yourself. Use `$'line1\nline2\nline3\nline4'` in the shell command to embed literal newlines:

```bash
fixbill "/path/receipt.pdf" $'บริษัท ตัวอย่าง จำกัด\n99/1 อาคารตัวอย่าง ชั้น 10\nถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110\nTH VAT 0000000000000'
```

If the address is already multi-line or clearly structured, pass it as-is.

## Step 1 — Preflight: is the CLI installed?

```bash
command -v fixbill
```

If this prints a path, run `fixbill doctor`. If doctor passes, continue to Step 2.

If it prints nothing or errors with `Could not find tsx at .../server/node_modules/...`:

1. Tell the user setup is needed (one sentence).
2. Check if the repo is cloned: `ls -d ~/fixbill-cli 2>/dev/null` (Windows: `%USERPROFILE%\fixbill-cli`)
   - Found → guide them:
     - macOS/Linux: `cd ~/fixbill-cli && sudo npm run setup`
     - Windows: `cd %USERPROFILE%\fixbill-cli && npm run setup` (no sudo)
   - Not found → ask them to clone https://github.com/iampon-p/fixbill-cli, then run setup as above.
3. After they confirm setup is done, re-run `command -v fixbill` before continuing.

**Windows note:** PowerShell/CMD paths (`C:\Users\<your-user>\...`) and Git Bash paths (`/c/Users/<your-user>/...`) are supported when the file exists. For direct terminal multi-line addresses, use Git Bash because the `$'line1\nline2'` newline syntax works there. Claude Code's Bash tool on Windows is Git Bash.

## Step 2 — Run the fix

Prefer quoting both path and value arguments, but the CLI can recover an unquoted PDF path with spaces when the file already exists:

```bash
# Address fix
fixbill "/path/to/receipt.pdf" "บริษัท ตัวอย่าง จำกัด 123 ถ.สุขุมวิท กทม. 10110"

# Date fix only
fixbill "/path/to/receipt.pdf" "21/05/2026"

# Title only
fixbill "/path/to/receipt.pdf" --title "ใบแจ้งหนี้"

# Fix invoice number
fixbill "/path/to/receipt.pdf" --invoice "INV-2026-001"

# Fix receipt number
fixbill "/path/to/receipt.pdf" --receipt "REC-0001"

# Fix due date
fixbill "/path/to/receipt.pdf" --due "30/05/2026"

# Fix date paid
fixbill "/path/to/receipt.pdf" --date-paid "March 9, 2909"

# Replace logo
fixbill "/path/to/receipt.pdf" --logo "/path/to/logo.png"

# Draw separator lines
fixbill "/path/to/receipt.pdf" --line

# Combined: date + invoice + due in one pass
fixbill "/path/to/receipt.pdf" "21/05/2026" --invoice "INV-001" --due "30/05/2026"

# Combined: title + invoice + receipt
fixbill "/path/to/receipt.pdf" --title "ใบแจ้งหนี้" --invoice "INV-001" --receipt "REC-001"
```

Stream output so the user sees progress. Typically takes 5–20 seconds.

## Step 3 — Verify and report

- **Exit 0:** Confirm `~/Downloads/<original-name>_edit.pdf` exists with `ls -la`. Tell the user the local path, then proceed to Step 4.
- **Exit non-zero:** Show the last ~20 lines of CLI output. Don't retry with different arguments. Match against the failure table below. Skip Step 4 — there's nothing to upload.

## Step 4 — Save to Google Drive

The CLI never does this itself — it's your job, using whichever Drive connector tool is available in your session (Claude's `Google Drive` MCP tools, or Codex's `google drive_*` connector tools). Skip this step entirely if the user asked you to run `fixbill` from a plain terminal on their behalf without Claude/Codex acting as the front-end — but in a normal `/fixbill` invocation, always do it.

1. **Get the client name** from the CLI's stdout — it prints `Client Name detected: <name>` (both address-fix and field-fix modes print this line).
2. **Get or create the client folder**: search for a folder named `<client>` inside a `fixbill` root folder (search/create the `fixbill` root first if it doesn't exist, then the client folder inside it). Use `parentId` search scoping — don't just match on name globally.
3. **Check for same-day collision**: search the client folder for a file already named `DD-MM-YYYY-edit-<client>.pdf` (today's date). 
   - **No collision** — upload directly into `/fixbill/<client>/`:
     - `DD-MM-YYYY-edit-<client>.pdf` — the fixed PDF from `~/Downloads/<original-name>_edit.pdf`
     - `DD-MM-YYYY-original-<client>.pdf` — the original PDF the user dropped in
   - **Collision** (client already fixed a bill today) — instead of overwriting, create a `<client>-<time>` subfolder (e.g. `บริษัท ตัวอย่าง จำกัด-14-32-07`, 24h HH-MM-SS) inside `/fixbill/<client>/` and upload both files there with the same `DD-MM-YYYY-edit-<client>.pdf` / `DD-MM-YYYY-original-<client>.pdf` names.
4. Report both Drive file links to the user alongside the local Downloads path.

If the Drive connector isn't authenticated or a call fails, tell the user the local file is still saved and ready — don't block on Drive, and don't retry more than once.

## Common failure modes

| CLI output | Cause | Tell the user |
|---|---|---|
| `command not found: fixbill` | CLI not installed | Run `sudo npm run setup` from the fixbill-cli folder |
| `Could not find tsx at ...` | Server deps missing | `cd ~/fixbill-cli/server && npm install` |
| `Could not find "Bill to" block` | PDF layout not supported | PDF format not supported for address fix |
| `Invoice number label not found` | PDF uses unrecognized invoice label | PDF has no supported invoice number field |
| `Receipt number label not found` | PDF has no recognized receipt number field | Confirm the PDF has a receipt number field |
| `Due date label not found` | PDF has no recognized due date field | Confirm the PDF has a due date field |
| `Date paid label not found` | PDF has no recognized date paid field | Confirm the PDF has a date paid field |
| `Cannot load logo image` | Image path wrong or format unsupported | Check path; only PNG and JPEG are supported |
| Date not replaced / old date still visible | Date format mismatch | Check date entered as `DD/MM/YYYY` |
| Clipped Thai characters | Font path issue | Check `THAI_FONT_PATH` in `server/.env` points to `NotoSansThai-Regular.ttf` |

## What NOT to do

- Don't rewrite the PDF yourself — the CLI handles Thai font embedding.
- Don't modify the original PDF in place. The CLI saves to `~/Downloads/<name>_edit.pdf`.
- Don't infer field values from the PDF — the user must provide them.
- Don't retry on error with different arguments — diagnose first.
- Don't skip the Drive upload (Step 4) silently — either do it or tell the user why you didn't.
- Don't overwrite a same-day Drive file for the same client — use the collision subfolder instead.

## Example sessions

**Title fix:**
User drops `QT-2026-0002.pdf` and says "change the title to ใบแจ้งหนี้"
1. `command -v fixbill` → path found ✓
2. `fixbill "/path/QT-2026-0002.pdf" --title "ใบแจ้งหนี้"`
3. Confirm `~/Downloads/QT-2026-0002_edit.pdf` → report path.
4. Save to Drive (Step 4) → report Drive links.

**Receipt number fix:**
User says "change receipt number to REC-0001"
1. `command -v fixbill` → path found ✓
2. `fixbill "/path/Receipt.pdf" --receipt "REC-0001"`
3. Confirm file → report path.
4. Save to Drive (Step 4) → report Drive links.

**Logo fix:**
User drops `invoice.pdf` and drops a new logo image at `/Users/<your-user>/logo.png`
1. `command -v fixbill` → path found ✓
2. `fixbill "/path/invoice.pdf" --logo "/Users/<your-user>/logo.png"`
3. Confirm file → report path.
4. Save to Drive (Step 4) → report Drive links. Tell user the logo replaced the top-right area.

**Combined fix:**
User says "fix date to 21/05/2026, invoice to INV-001, due date to 30/05/2026"
1. `command -v fixbill` → path found ✓
2. `fixbill "/path/Invoice.pdf" "21/05/2026" --invoice "INV-001" --due "30/05/2026"`
3. Confirm file → report path.
4. Save to Drive (Step 4) → report Drive links.

**Date paid fix:**
User says "mark this receipt as paid on 21/05/2026"
1. `command -v fixbill` → path found ✓
2. `fixbill "/path/Receipt.pdf" --date-paid "21/05/2026"`
3. Confirm file → report path.
4. Save to Drive (Step 4) → report Drive links.

---

## Tip — Save tokens: run fixbill directly in terminal

If you already know the exact arguments, you can skip Claude entirely and call the CLI directly. No tokens used. **No Google Drive save either** — the CLI has no Drive integration of its own; Drive save only happens when Claude or Codex runs the command and does the upload itself (Step 4). Direct terminal use always stays local-only, in `~/Downloads`.

```bash
# Address fix (pre-structure the address yourself with \n)
fixbill "/path/receipt.pdf" $'บริษัท ชื่อบริษัท จำกัด\n123 ถ.ถนน\nเขตXXX กทม. 10400\nTH VAT 0000000000000'

# Date fix
fixbill "/path/receipt.pdf" "21/05/2026"

# Any flag combination
fixbill "/path/receipt.pdf" "21/05/2026" --invoice "INV-001" --title "ใบแจ้งหนี้"
```

Use Claude/Codex (/fixbill) when: address is unstructured, you want the assistant to turn it into clean address rows before running the CLI, you're unsure which flags to use, or you want it saved to Google Drive + error diagnosis.

Use terminal directly when: you already know the exact command and have already structured any address line breaks yourself.
