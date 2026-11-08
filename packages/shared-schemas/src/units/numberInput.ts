const SUFFIX_MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  K: 1e3,
  m: 1e6,
  M: 1e6,
  b: 1e9,
  B: 1e9,
  t: 1e12,
  T: 1e12,
};

type NumberParseResult =
  | { success: true; value: number }
  | { success: true; value: undefined }
  | { success: false; error: string };

export function parseNumberInput(value: unknown): NumberParseResult {
  if (value === undefined || value === null || value === '') {
    return { success: true, value: undefined };
  }

  if (value === 0 || value === '0') {
    return { success: true, value: 0 };
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return { success: true, value };
    }
    return { success: false, error: 'Invalid number value' };
  }

  const str = String(value).trim();
  if (!str) {
    return { success: true, value: undefined };
  }

  const cleaned = str.replace(/[,\s_]/g, '');
  if (!cleaned) {
    return { success: true, value: undefined };
  }

  // PITFALL: e-notation must be checked before suffixes, or "1e" reads as a bad suffix instead of incomplete notation.
  if (/[eE]/.test(cleaned)) {
    const eNotationRegex = /^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/;
    const eMatch = cleaned.match(eNotationRegex);

    if (eMatch) {
      const mantissa = parseFloat(eMatch[1]);
      const exponent = parseInt(eMatch[2], 10);

      if (Number.isFinite(mantissa) && Number.isFinite(exponent)) {
        return { success: true, value: mantissa * Math.pow(10, exponent) };
      }
      return { success: false, error: 'Invalid scientific notation' };
    }

    if (/[eE]$/.test(cleaned) || /[eE][+-]$/.test(cleaned)) {
      return { success: false, error: 'Incomplete scientific notation (e.g., use 1.5e6)' };
    }
    return { success: false, error: 'Invalid scientific notation format' };
  }

  const suffixMatch = cleaned.match(/^([+-]?\d*\.?\d+)([kKmMbBtT])$/);
  if (suffixMatch) {
    const base = parseFloat(suffixMatch[1]);
    const suffix = suffixMatch[2];
    const multiplier = SUFFIX_MULTIPLIERS[suffix];

    if (Number.isFinite(base) && multiplier) {
      return { success: true, value: base * multiplier };
    }
    return { success: false, error: 'Invalid suffix notation' };
  }

  if (/^\d+\.?\d*[a-zA-Z]$/.test(cleaned) && !/^[+-]?\d*\.?\d+[kKmMbBtT]$/.test(cleaned)) {
    return {
      success: false,
      error: 'Invalid suffix. Use K (thousand), M (million), B (billion), or T (trillion)',
    };
  }

  const caretWithMantissaMatch = cleaned.match(/^([+-]?\d*\.?\d+)[xX*×]10\^([+-]?\d+)$/);
  if (caretWithMantissaMatch) {
    const mantissa = parseFloat(caretWithMantissaMatch[1]);
    const exponent = parseInt(caretWithMantissaMatch[2], 10);

    if (Number.isFinite(mantissa) && Number.isFinite(exponent)) {
      return { success: true, value: mantissa * Math.pow(10, exponent) };
    }
    return { success: false, error: 'Invalid caret notation' };
  }

  const caretOnlyMatch = cleaned.match(/^10\^([+-]?\d+)$/);
  if (caretOnlyMatch) {
    const exponent = parseInt(caretOnlyMatch[1], 10);

    if (Number.isFinite(exponent)) {
      return { success: true, value: Math.pow(10, exponent) };
    }
    return { success: false, error: 'Invalid caret notation' };
  }

  if (/\^/.test(cleaned)) {
    if (/10\^$/.test(cleaned) || /[xX*×]10\^$/.test(cleaned)) {
      return { success: false, error: 'Incomplete caret notation (e.g., use 1.5x10^6)' };
    }
    return { success: false, error: 'Invalid caret notation format (e.g., use 10^6 or 1.5x10^6)' };
  }

  const num = Number(cleaned);
  if (Number.isFinite(num)) {
    return { success: true, value: num };
  }

  return { success: false, error: 'Invalid number' };
}
