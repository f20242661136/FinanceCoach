import { z } from 'zod';
import { transactionCreatePayloadSchema } from '@/offline/sync/mutation-payloads';
import { syncAccountSchema, syncTransactionSchema } from '@/offline/sync/sync-schema';

export const CSV_LIMITS = { bytes: 10 * 1024 * 1024, rows: 10000, columns: 128, cell: 16384 } as const;
export const fields = ['amount', 'date', 'type', 'account', 'category', 'currency', 'merchant', 'description', 'notes', 'externalId', 'sourceId'] as const;
export type Field = typeof fields[number];
export type Mapping = Partial<Record<Field, number>>;
export type Options = {
  mapping: Mapping; accountId: string; incomeCategory: string; expenseCategory: string;
  defaultType: 'income' | 'expense'; dateFormat: 'iso' | 'dmy' | 'mdy'; decimal: '.' | ',';
  signed: boolean; skipMatching: boolean; source: string;
};
export type Account = { id: string; name: string; currency_code: string; currency_minor_unit: number };
export type Category = { id: string; kind: string; default_name: string };
export type Table = { headers: string[]; rows: string[][] };
export const importPayloadSchema = transactionCreatePayloadSchema.extend({
  csv: z.object({ key: z.string().regex(/^[a-f0-9]{64}$/), skipMatching: z.boolean(), sourceId: z.string().uuid().nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/), unit: z.number().int().min(0).max(4) }),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;
export const csvAckSchema = z.object({status:z.enum(['imported','duplicate']),transaction_id:z.string().uuid(),replayed:z.boolean(),
  snapshot:z.object({accounts:z.array(syncAccountSchema),transactions:z.array(syncTransactionSchema)})});
export type PreviewRow = { row: number; status: 'ready' | 'invalid' | 'duplicate'; reason: string; payload?: ImportPayload };
export const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Strict decoding prevents invalid bytes from silently changing a financial record.
export async function decodeCSV(bytes: Uint8Array): Promise<string> {
  if (bytes.length > CSV_LIMITS.bytes) throw Error('CSV exceeds 10 MiB. Split it into smaller files.');
  const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe ? 'le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'be' : null;
  let i = utf16 ? 2 : bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  let part = '', output = '', nextYield = 65536;
  while (i < bytes.length) {
    let cp: number;
    if (utf16) {
      if (i + 1 >= bytes.length) throw Error('Invalid UTF-16 CSV.');
      cp = utf16 === 'le' ? bytes[i] | bytes[i + 1] << 8 : bytes[i] << 8 | bytes[i + 1]; i += 2;
      if (cp >= 0xd800 && cp <= 0xdbff) {
        if (i + 1 >= bytes.length) throw Error('Invalid UTF-16 surrogate.');
        const low = utf16 === 'le' ? bytes[i] | bytes[i + 1] << 8 : bytes[i] << 8 | bytes[i + 1]; i += 2;
        if (low < 0xdc00 || low > 0xdfff) throw Error('Invalid UTF-16 surrogate.');
        cp = 0x10000 + (cp - 0xd800) * 1024 + low - 0xdc00;
      } else if (cp >= 0xdc00 && cp <= 0xdfff) throw Error('Invalid UTF-16 surrogate.');
    } else {
      const first = bytes[i++]; cp = first;
      if (first >= 0x80) {
        const count = first >= 0xc2 && first <= 0xdf ? 1 : first >= 0xe0 && first <= 0xef ? 2 : first >= 0xf0 && first <= 0xf4 ? 3 : -1;
        if (count < 0 || i + count > bytes.length) throw Error('Invalid UTF-8. Save CSV as UTF-8 or UTF-16 with BOM.');
        cp = first & (count === 1 ? 31 : count === 2 ? 15 : 7);
        for (let n = 0; n < count; n++) { const b = bytes[i++]; if ((b & 0xc0) !== 0x80) throw Error('Invalid UTF-8 CSV.'); cp = cp * 64 + (b & 63); }
        if (cp < (count === 1 ? 128 : count === 2 ? 2048 : 65536) || cp > 0x10ffff || cp >= 0xd800 && cp <= 0xdfff) throw Error('Invalid UTF-8 CSV.');
      }
    }
    if (cp === 0) throw Error('CSV contains a NUL character.');
    part += String.fromCodePoint(cp);
    if (i >= nextYield) { output += part; part = ''; nextYield = i + 65536; await yieldToUI(); }
  }
  return output + part;
}
export async function parseCSV(text: string, delimiter = ','): Promise<Table> {
  text = text.replace(/^\uFEFF/, '');
  if (![',', ';', '\t'].includes(delimiter)) throw Error('Unsupported separator.');
  const records: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  const endCell = () => { row.push(cell); cell = ''; closed = false; if (row.length > CSV_LIMITS.columns) throw Error('Too many columns (maximum 128).'); };
  const endRow = () => { endCell(); if (row.some(v => v !== '')) records.push(row); row = []; if (records.length > CSV_LIMITS.rows + 1) throw Error('CSV exceeds 10,000 rows. Split it into smaller files.'); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c;
    } else if (c === delimiter) endCell();
    else if (c === '\r' || c === '\n') { endRow(); if (c === '\r' && text[i + 1] === '\n') i++; }
    else if (c === '"' && cell === '' && !closed) quoted = true;
    else { if (closed || c === '"') throw Error(`Malformed quoting near record ${records.length + 1}.`); cell += c; }
    if (cell.length > CSV_LIMITS.cell) throw Error('A CSV cell exceeds 16,384 characters.');
    if (i % 65536 === 0) await yieldToUI();
  }
  if (quoted) throw Error('CSV has an unclosed quote.');
  if (cell !== '' || row.length || closed) endRow();
  const headers = records.shift()?.map(v => v.trim()) ?? [];
  if (!headers.length || headers.some(h => !h) || new Set(headers.map(h => h.toLowerCase())).size !== headers.length) throw Error('CSV needs unique, non-empty column headers.');
  return { headers, rows: records };
}
export function autoMapping(headers: string[]): Mapping {
  const aliases: Record<Field, string[]> = { amount: ['amount'], date: ['date', 'transaction_date'], type: ['type'], account: ['account_id', 'account'], category: ['category_id', 'category'], currency: ['currency_code', 'currency'], merchant: ['merchant'], description: ['description'], notes: ['notes'], externalId: ['external_id', 'reference'], sourceId: ['transaction_id'] };
  const mapping: Mapping = {};
  for (const field of fields) { const index = headers.findIndex(h => aliases[field].includes(h.toLowerCase())); if (index >= 0) mapping[field] = index; }
  return mapping;
}
export function parseMoney(raw: string, unit: number, decimal: '.' | ','): string {
  if (!Number.isInteger(unit) || unit < 0 || unit > 4) throw Error('Unsupported currency precision.');
  const value = raw.trim(); const pattern = decimal === '.' ? /^\d+(?:\.\d+)?$/ : /^\d+(?:,\d+)?$/;
  if (!pattern.test(value)) throw Error('Amount must be a positive decimal without thousands separators.');
  const [whole, fraction = ''] = value.split(decimal);
  if (fraction.length > unit) throw Error(`Amount has more than ${unit} decimal places.`);
  const minor = BigInt(whole) * 10n ** BigInt(unit) + BigInt(fraction.padEnd(unit, '0') || '0');
  if (minor <= 0n || minor > 9223372036854775807n) throw Error('Amount must be greater than zero and within the supported range.');
  return minor.toString();
}
export function parseDate(raw: string, format: Options['dateFormat']): string {
  const match = format === 'iso' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim()) : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!match) throw Error('Date does not match the selected date format.');
  const year = Number(format === 'iso' ? match[1] : match[3]), month = Number(format === 'iso' ? match[2] : format === 'dmy' ? match[2] : match[1]), day = Number(format === 'iso' ? match[3] : format === 'dmy' ? match[1] : match[2]);
  const days = month === 2 ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > days) throw Error('Date is not a real calendar date.');
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function normalizeRow(values: string[], headers: string[], options: Options, accounts: Account[], categories: Category[]) {
  if (values.length !== headers.length) throw Error(`Expected ${headers.length} columns, found ${values.length}.`);
  const safe = headers.indexOf('csv_safety_version');
  const get = (field: Field) => { const i = options.mapping[field]; let v = i === undefined ? '' : (values[i] ?? '').trim(); if (safe >= 0 && values[safe] === '1' && /^'(?:'|[\s\uFEFF]*[=+\-@]|[\t\r\n])/.test(v)) v = v.slice(1); return v; };
  if (options.mapping.amount === undefined || options.mapping.date === undefined) throw Error('Map amount and date columns.');
  const suppliedAccount = get('account');
  const matches = suppliedAccount ? accounts.filter(a => a.id === suppliedAccount || a.name.toLowerCase() === suppliedAccount.toLowerCase()) : accounts.filter(a => a.id === options.accountId);
  if (matches.length !== 1) throw Error('Account is missing, unavailable, or its name is ambiguous.');
  const account = matches[0];
  if (get('currency') && get('currency').toUpperCase() !== account.currency_code) throw Error('Currency differs from the account; conversion is not supported.');
  let amount = get('amount'); const suppliedType = get('type').toLowerCase();
  const types: Record<string, 'income' | 'expense'> = { income: 'income', credit: 'income', expense: 'expense', debit: 'expense' };
  if (suppliedType && !types[suppliedType]) throw Error('Only income and expense can be imported. Enter transfers through Transfer.');
  let type: 'income' | 'expense' = suppliedType ? types[suppliedType] : options.defaultType;
  if (options.signed) { const inferred = amount.startsWith('-') ? 'expense' : 'income'; if (suppliedType && type !== inferred) throw Error('Signed amount conflicts with the transaction type.'); type = inferred; amount = amount.replace(/^[+-]/, ''); }
  const suppliedCategory = get('category'), categoryId = type === 'income' ? options.incomeCategory : options.expenseCategory;
  const cats = categories.filter(c => c.kind === type && (suppliedCategory ? c.id === suppliedCategory || c.default_name.toLowerCase() === suppliedCategory.toLowerCase() : c.id === categoryId));
  if (cats.length !== 1) throw Error(`Choose a unique ${type} category or map a valid category.`);
  const clean = (f: Field, max: number) => { const value = get(f); if (Array.from(value).length > max) throw Error(`${f} exceeds ${max} characters.`); return value || null; };
  const sourceId = get('sourceId') || null; if (sourceId && !z.string().uuid().safeParse(sourceId).success) throw Error('Transaction ID is invalid.');
  const externalId = get('externalId'); if (externalId.length > 200) throw Error('External reference exceeds 200 characters.');
  return { accountId: account.id, categoryId: cats[0].id, type, amountMinor: parseMoney(amount, account.currency_minor_unit, options.decimal), transactionDate: parseDate(get('date'), options.dateFormat), merchant: clean('merchant', 120), description: clean('description', 160), notes: clean('notes', 2000), currency: account.currency_code, unit: account.currency_minor_unit, sourceId, externalId };
}
export function csvLine(values: (string | null | number)[], textColumns: boolean[] = []): string {
  return values.map((v, i) => { let s = String(v ?? ''); if (textColumns[i] && /^[\s\uFEFF]*[=+\-@]|^[\t\r\n']/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }).join(',') + '\r\n';
}
export function decimalAmount(minor: string, unit: number): string {
  const value = BigInt(minor), digits = (value < 0n ? -value : value).toString().padStart(unit + 1, '0');
  return (value < 0n ? '-' : '') + (unit ? digits.slice(0, -unit) + '.' + digits.slice(-unit) : digits);
}
