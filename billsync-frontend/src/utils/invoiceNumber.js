// Utility to manage sequential invoice numbers with reuse of deleted numbers
// Uses localStorage to keep a pool of freed numbers and a record of deleted invoices

const FREED_KEY = 'freedInvoiceNumbers';

const loadFreed = () => {
  try {
    const arr = JSON.parse(localStorage.getItem(FREED_KEY) || '[]');
    return Array.isArray(arr) ? arr.filter(n => Number.isInteger(Number(n))).map(n => Number(n)) : [];
  } catch {
    return [];
  }
};

export const reserveInvoiceNumber = (num) => {
  // Ensure a specific number is not considered free (useful when restoring)
  const freed = loadFreed();
  const filtered = freed.filter(n => Number(n) !== Number(num));
  saveFreed(filtered);
};

const saveFreed = (arr) => {
  localStorage.setItem(FREED_KEY, JSON.stringify(Array.from(new Set(arr)).sort((a,b)=>a-b)));
};

export const freeInvoiceNumber = (num) => {
  const freed = loadFreed();
  if (!freed.includes(num)) {
    freed.push(num);
    saveFreed(freed);
  }
};

export const consumeNextInvoiceNumber = (existingNumbers = []) => {
  // existingNumbers: array of numbers in use (active invoices)
  const freed = loadFreed();
  freed.sort((a,b)=>a-b);
  if (freed.length > 0) {
    const next = freed.shift();
    saveFreed(freed);
    return next;
  }
  const maxExisting = existingNumbers.length ? Math.max(...existingNumbers) : 0;
  return maxExisting + 1;
};

export const extractNumericInvoiceNumber = (invoice) => {
  // Try to parse numeric invoice_number field; supports strings like "INV-0001" by extracting trailing digits
  const raw = invoice?.invoice_number ?? invoice?.id ?? null;
  if (raw == null) return null;
  const s = String(raw);
  const m = s.match(/(\d+)/g);
  if (!m) return null;
  return Number(m[m.length - 1]);
};
