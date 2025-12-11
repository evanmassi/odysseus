// Quick test of concentration parsing - matches tubeValidation.ts logic
const SUFFIX_MULTIPLIERS = { 'k': 1e3, 'K': 1e3, 'm': 1e6, 'M': 1e6, 'b': 1e9, 'B': 1e9, 't': 1e12, 'T': 1e12 };

function parseConcentrationInput(value) {
  if (value === undefined || value === null || value === '') return { success: true, value: undefined };
  if (value === 0 || value === '0') return { success: true, value: 0 };
  if (typeof value === 'number') return Number.isFinite(value) ? { success: true, value } : { success: false, error: 'Invalid number' };

  const str = String(value).trim();
  if (!str) return { success: true, value: undefined };

  const cleaned = str.replace(/[,\s_]/g, '');
  if (!cleaned) return { success: true, value: undefined };

  // 1. E-notation FIRST (before suffix, since 'e' could be confused)
  if (/[eE]/.test(cleaned)) {
    const eMatch = cleaned.match(/^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/);
    if (eMatch) {
      const m = parseFloat(eMatch[1]);
      const e = parseInt(eMatch[2], 10);
      if (Number.isFinite(m) && Number.isFinite(e)) return { success: true, value: m * Math.pow(10, e) };
      return { success: false, error: 'Invalid scientific notation' };
    }
    if (/[eE]$/.test(cleaned) || /[eE][+-]$/.test(cleaned)) return { success: false, error: 'Incomplete scientific notation (e.g., use 1.5e6)' };
    return { success: false, error: 'Invalid scientific notation format' };
  }

  // 2. Suffix
  const suffixMatch = cleaned.match(/^([+-]?\d*\.?\d+)([kKmMbBtT])$/);
  if (suffixMatch) {
    const base = parseFloat(suffixMatch[1]);
    const mult = SUFFIX_MULTIPLIERS[suffixMatch[2]];
    if (Number.isFinite(base) && mult) return { success: true, value: base * mult };
    return { success: false, error: 'Invalid suffix notation' };
  }

  if (/^\d+\.?\d*[a-zA-Z]$/.test(cleaned) && !/^[+-]?\d*\.?\d+[kKmMbBtT]$/.test(cleaned)) {
    return { success: false, error: 'Invalid suffix. Use K, M, B, or T' };
  }

  // 3. Caret with mantissa
  const caretWithMantissa = cleaned.match(/^([+-]?\d*\.?\d+)[xX*]10\^([+-]?\d+)$/);
  if (caretWithMantissa) {
    const m = parseFloat(caretWithMantissa[1]);
    const e = parseInt(caretWithMantissa[2], 10);
    if (Number.isFinite(m) && Number.isFinite(e)) return { success: true, value: m * Math.pow(10, e) };
    return { success: false, error: 'Invalid caret notation' };
  }

  // Caret only
  const caretOnly = cleaned.match(/^10\^([+-]?\d+)$/);
  if (caretOnly) {
    const e = parseInt(caretOnly[1], 10);
    if (Number.isFinite(e)) return { success: true, value: Math.pow(10, e) };
    return { success: false, error: 'Invalid caret notation' };
  }

  if (/\^/.test(cleaned)) {
    if (/10\^$/.test(cleaned) || /[xX*]10\^$/.test(cleaned)) return { success: false, error: 'Incomplete caret notation' };
    return { success: false, error: 'Invalid caret notation format' };
  }

  // 4. Plain number
  const num = Number(cleaned);
  if (Number.isFinite(num)) return { success: true, value: num };

  return { success: false, error: 'Invalid concentration value' };
}

const testCases = [
  // Valid inputs
  ['5000000', 'plain number'],
  ['5,000,000', 'with commas'],
  ['5 000 000', 'with spaces'],
  ['5_000_000', 'with underscores'],
  ['1.5e6', 'e-notation'],
  ['1.5E+6', 'E-notation with +'],
  ['1e-3', 'negative exponent'],
  ['10^6', 'caret only'],
  ['1.5x10^6', 'caret with mantissa'],
  ['1.5*10^6', 'caret with asterisk'],
  ['5M', 'million suffix'],
  ['1.5K', 'thousand suffix'],
  ['2B', 'billion suffix'],
  ['', 'empty string'],

  // Invalid inputs
  ['1e', 'incomplete e-notation'],
  ['1e+', 'incomplete e-notation +'],
  ['10^', 'incomplete caret'],
  ['1.5x10^', 'incomplete caret x'],
  ['abc', 'text'],
  ['12abc', 'number with text'],
  ['5Z', 'invalid suffix'],
];

console.log('Testing parseConcentrationInput:\n');
console.log('Description'.padEnd(25) + ' | ' + 'Input'.padEnd(15) + ' | Result');
console.log('-'.repeat(70));
testCases.forEach(([input, desc]) => {
  const result = parseConcentrationInput(input);
  let status;
  if (result.success) {
    status = result.value !== undefined ? result.value.toExponential(2) : 'undefined (valid)';
  } else {
    status = 'ERROR: ' + result.error;
  }
  console.log(desc.padEnd(25) + ' | ' + String(input).padEnd(15) + ' | ' + status);
});
