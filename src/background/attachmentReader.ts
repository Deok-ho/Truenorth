import type { AttachmentMeta } from '@shared/types';
import { read, utils } from 'xlsx';

/**
 * Fetches an attachment file and extracts its text content.
 * Uses the simplest extraction: Excel → CSV, others → skip for now.
 *
 * @returns Plain text content or null if extraction failed/unsupported.
 */
export async function extractAttachmentText(
  attachment: AttachmentMeta,
): Promise<string | null> {
  if (!attachment.url) return null;

  try {
    switch (attachment.type) {
      case 'excel':
        return await extractExcel(attachment.url);
      default:
        // PDF, Word, etc. — future extension
        return null;
    }
  } catch (err) {
    console.warn(`[ApprovalGraph] Attachment extraction failed for ${attachment.name}:`, err);
    return null;
  }
}

/**
 * Fetches an Excel file and extracts all sheet data as CSV text.
 * No formulas — just values.
 */
async function extractExcel(url: string): Promise<string | null> {
  const response = await fetch(url);
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });

  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      parts.push(`[시트: ${sheetName}]\n${csv}`);
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * Extracts text from all supported attachments.
 * Returns array of {name, content} pairs.
 */
export async function extractAllAttachments(
  attachments: AttachmentMeta[],
): Promise<Array<{ name: string; content: string }>> {
  const results: Array<{ name: string; content: string }> = [];

  for (const att of attachments) {
    const text = await extractAttachmentText(att);
    if (text) {
      results.push({ name: att.name, content: text });
    }
  }

  return results;
}
