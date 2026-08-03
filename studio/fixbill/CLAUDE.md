# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

### macOS / Linux

```bash
# Install all dependencies (root + server; no client/ workspace exists yet)
npm install && npm install --prefix server

# Register global CLI command
sudo npm link

# Install FixBill Claude Code skill globally (copies to ~/.claude/)
node scripts/install-skill.js
```

### Windows (native Command Prompt / PowerShell)

```cmd
# Install all dependencies
npm install
npm install --prefix server

# Register global CLI command (no sudo needed)
npm link

# Install FixBill Claude Code skill globally (copies to %USERPROFILE%\.claude\)
node scripts/install-skill.js
```

## Commands

# Type-check server
cd server && npx tsc -p tsconfig.json --noEmit

# Run all server tests
cd server && npm test

# Run a single test file
cd server && npm test -- --testPathPattern=workflow

# Run the CLI (after npm link)
fixbill help
fixbill doctor                                      # verify CLI, server deps, and Claude skill install
fixbill update                                        # pull latest + reinstall server deps
fixbill <path> "<address>"                            # fix Bill-to address
fixbill <path> "<DD/MM/YYYY>"                         # fix issue date
fixbill <path> --title "<text>"                       # change document title only
fixbill <path> --invoice "<text>"                     # fix invoice number
fixbill <path> --receipt "<text>"                     # fix receipt number
fixbill <path> --due "<text>"                         # fix due date
fixbill <path> --date-paid "<text>"                   # fix date paid
fixbill <path> --logo <image-path>                    # replace top-right logo (PNG/JPEG)
fixbill <path> "<address>" --due "<text>"             # fix address + fields in one output
fixbill <path> "<address>" "<DD/MM/YYYY>" --due "<text>" # fix address + date + fields
```

**Important notes:**
- PDF paths with spaces are supported when the file already exists; the CLI rejoins split path pieces before parsing the address/date/flags
- Address values with spaces still need quotes, e.g. `fixbill /Users/me/Downloads/my invoice.pdf "บริษัท A จำกัด"`
- Windows supports PowerShell/CMD paths (`C:\Users\<your-user>\...`) and Git Bash paths (`/c/Users/<your-user>/...`) when the file exists
- Paths with bare parentheses may still need quotes or escaping because shells can interpret `()` before the CLI receives the args
- Claude/Codex `/fixbill` should restructure single-line unstructured addresses into clean rows before calling the CLI; direct terminal users must provide their own address line breaks
- Root-level `npm run build/dev/typecheck` will error — the `client` workspace doesn't exist yet. Use server-scoped commands.
- On Windows, use `%USERPROFILE%\fixbill-cli` instead of `~/fixbill-cli` in paths
- Skill installation (`node scripts/install-skill.js`) is **cross-platform** — replaces old bash installer

**Tests and fixtures:**
- `outputService.test.ts` is fixture-free and uses in-memory PDF-like bytes.
- `workflow.test.ts` expects sample PDF `Original_receipt copy.pdf` one directory **above** the repo (`../Reference/`). If absent, it is skipped; do not count that as an E2E pass.

## Architecture

CLI-only tool (no server runs during normal use). Single entry point:
- **`bin/cli.js`** — registered by `npm link` via `package.json#bin`; the global `fixbill` command
  - On Windows: spawns tsx via native `node` binary (avoids `npx.cmd` shim issues)
  - On macOS/Linux: spawns tsx directly via node
  - For git/npm commands: uses native shell on Windows (`cmd.exe`/PowerShell) as needed

Routes to TypeScript scripts via `tsx` (locally installed, not `npx`):

| Command shape | Script |
|---|---|
| `fixbill <pdf> <address>` | `server/scripts/fixbill.ts` (address-fix mode) |
| `fixbill <pdf> <date\|flag>` | `server/scripts/fixfields.ts` (field-fix mode) |
| `fixbill <pdf> <address> <date?> <flag...>` | `server/scripts/fixall.ts` (address + field-fix mode) |

**Argument recovery:** `bin/cli.js` first finds the longest existing PDF path prefix from the raw argv list. This lets terminal commands like `fixbill /Users/me/Downloads/my invoice.pdf "tester"` work even though the shell split the path at spaces. On Windows, argument recovery also normalizes Git Bash drive paths like `/c/Users/<your-user>/file.pdf` to `C:\Users\<your-user>\file.pdf` before passing the path to the TypeScript scripts.

**Routing logic:** after path recovery, if the first fix argument is an address and either field flags or a following `DD/MM/YYYY` are present → combined `fixall.ts` mode. If the first fix argument is `DD/MM/YYYY` or a field flag → field-fix mode. Otherwise → address-fix mode. Combined mode preserves the address as the source for `Client Name detected: ...`, because the old PDF text layer can be stale or garbled after masking.

### Field-Fix Mode (`server/scripts/fixfields.ts`)

Parses all flags, resolves the PDF path against the user's original cwd (`originalDir`), calls `fixPdfDates()`, writes output to `~/Downloads/<name>_edit.pdf`. After the fix completes, calls `checkForUpdates()` to notify if `origin/main` has new commits.

Flags are fully combinable. `--convert` is a legacy undocumented alias for `--title` still in the code; `--title` takes precedence if both are passed.

### Auto-Update (`server/scripts/checkUpdate.ts`)

Runs `git fetch origin main --quiet` then compares `HEAD` to `origin/main`. If behind, prints a one-line notice. Called at the end of `fixfields.ts` after the fix succeeds.

`fixbill update` (handled in `FixBill` and `bin/cli.js`) runs `git pull origin main && npm install --prefix server`.

### PDF Engine — Field Fixing (`server/src/services/pdfDateService.ts`)

Central engine for all field fixes. Uses two libraries because no single library can both extract coordinates and write:
- **`pdfjs-dist`** — extracts text items with exact `(x, y)` coordinates
- **`pdf-lib`** — draws white rectangles (masks) and writes new text/images

**Pipeline for every field:**
1. `buildRows()` groups pdfjs items by y-coordinate proximity (±2.5 units)
2. A locator function finds the target field's bounding box (`BBox`)
3. `page.drawRectangle(white)` masks the old content
4. `page.drawText()` or `page.drawImage()` redraws the new value

**Locator helpers:**
- `findTextBBoxes(items, text)` — finds all occurrences of a literal string
- `findValueAfterLabel(items, pattern)` — finds the value on the same row or row below a regex-matched label (used for invoice, receipt, due, date-paid)
- `findTitleBBox` — hardcoded search for `'ใบเสนอราคา'` only; `--title` will fail silently if the PDF uses a different document title text

**Logo replacement:** uses a heuristic top-right region (x: 72% of width, y: 88% of height from bottom), masks with white, then embeds and scales the provided image to fit.

**Font:** `server/assets/fonts/NotoSansThai-Regular.ttf` (override with `THAI_FONT_PATH` env var). Thai text detection: `/[ก-๙]/u`. Thai text wrapping uses `Intl.Segmenter` at grapheme granularity (`wrapTextByWidth()` in `receiptHelpers.ts`).

### PDF Engine — Address Fixing (`server/src/services/pdfReceiptService.ts`)

Separate engine for Bill-to address replacement. Finds the `BILL_TO_PATTERN` block, walks downward until `ADDRESS_STOP_PATTERN` or gap > 40 units, masks and redraws with `fitTextToBox()` (shrinks font 11pt → 7.5pt to fit original box). Purely local — no Drive sync in this layer (see Google Drive section below).

**Re-fixing guard:** `isAlreadyFixedDocument()` in `receiptHelpers.ts` detects if the PDF was already processed (filename ends in `fix`/`fixed`/`fixbill`, or extracted Thai text looks garbled). When detected, it deduplicates repeated lines before attempting address extraction — prevents double-mask artefacts.

### Label Patterns (`server/src/utils/receiptHelpers.ts`)

All regex patterns that locate field labels in PDFs:
- `INVOICE_NO_LABEL_PATTERN` — เลขที่, Invoice number, Document No., etc. (used by `--invoice`)
- `RECEIPT_NO_LABEL_PATTERN` — Receipt number, เลขที่ใบเสร็จ (used by `--receipt`)
- `DUE_DATE_LABEL_PATTERN` — วันที่ครบกำหนด, Due Date, etc. (used by `--due`)
- `DATE_PAID_LABEL_PATTERN` — Date paid, วันที่ชำระ, etc. (used by `--date-paid`)
- `ISSUER_LABEL_PATTERN` / `ISSUER_STOP_PATTERN` — still exported; imported by `pdfDateService.ts` internally but no longer exposed via CLI flags

When adding support for a new field type, add its label pattern here and wire it through `pdfDateService.ts` and `fixfields.ts`.

**Note on deprecations:** removed silent auto-update from every CLI invocation (supply-chain risk pattern). Updates now only via explicit `fixbill update` call.

### Google Drive — moved out of the CLI (July 2026)

The CLI has **no Google Drive integration of its own** anymore — `fixbill.ts`/`fixfields.ts` only save locally to `~/Downloads/<name>_edit.pdf` and print `Client Name detected: <name>` to stdout. `server/scripts/login.ts` (Google Identity Services OAuth popup) was deleted; `fixbill login`/`fixbill logout` no longer exist.

Drive save is now a **skill-side** responsibility: `SKILL.md`'s Step 4 has Claude/Codex read the printed client name from CLI stdout, then use their own Drive connector (Claude's `Google Drive` MCP tools, or Codex's `google drive_*` connector tools) to upload the fixed + original PDF to `fixbill/<client>/`. A bare terminal `fixbill` run never touches Drive — there's no connector outside an LLM CLI session.

`server/src/services/googleDriveService.ts` and `server/src/services/driveService.ts` still exist on disk with their old OAuth2 (`googleapis`) implementations, but neither is called by the CLI scripts anymore. They're only reachable through the legacy Express web route below, which itself isn't used (no `client/` frontend exists, no deployed web app) — treat both as dead code, not the source of truth for how Drive save works today.

### Legacy Express / Firebase server

`server/src/index.ts` exports a Firebase Cloud Functions Express app (`createApp()`), including `server/src/routes/processReceipt.ts` which still calls `googleDriveService.ts` for its own (unused) auto-sync. `server/src/main.ts` and `server/src/dev.ts` are unused server entry points. `server/dist/` is a compiled output from when the tool ran as a cloud API. None of these are invoked by the CLI — they exist as artifacts from a prior architecture, kept around only because `workflow.test.ts` exercises `createApp()` over HTTP (that test mocks `driveService.ts`, not `googleDriveService.ts`, and is currently broken for unrelated pre-existing reasons — see Tests section).

### Debug utilities

`server/scripts/testIssuer.ts` — standalone debug script that prints issuer-block rows extracted from a PDF. Usage: `npx tsx server/scripts/testIssuer.ts <pdf-path>`. Not part of any CLI command.
