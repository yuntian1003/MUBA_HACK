import { createWorker } from 'tesseract.js';

export interface ReceiptAmount {
  amount: number;
  currency: string | null;
  source: string;
}

const amountPattern = /(?:RM|MYR|SUI|USD|EUR|GBP|[$€£])?\s*\d{1,6}(?:[,.]\d{2})/gi;
const totalPattern = /(?:grand\s+total|total\s+due|amount\s+due|total|amount\s+payable)/i;

function parseAmount(value: string): number | null {
  const normalized = value.replace(/[^\d.,]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractCandidate(line: string): ReceiptAmount | null {
  const match = line.match(amountPattern);
  if (!match) return null;
  const value = parseAmount(match[match.length - 1]);
  if (value === null) return null;
  const currencyMatch = match[match.length - 1].match(/RM|MYR|SUI|USD|EUR|GBP|[$€£]/i);
  return {
    amount: value,
    currency: currencyMatch?.[0]?.toUpperCase() ?? null,
    source: line.trim(),
  };
}

export async function detectReceiptAmount(file: File): Promise<ReceiptAmount | null> {
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(file);
    const lines = result.data.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const totalLine = lines.find((line) => totalPattern.test(line));
    const total = totalLine ? extractCandidate(totalLine) : null;
    if (total) return total;

    const candidates = lines.map(extractCandidate).filter((item): item is ReceiptAmount => item !== null);
    return candidates.sort((a, b) => b.amount - a.amount)[0] ?? null;
  } finally {
    await worker.terminate();
  }
}