/**
 * Scientific notation utilities
 *
 * ⚠️ DEPRECATED - Use formatters from @odysseus/shared-schemas instead
 * 
 * Phase 5 Migration:
 * - For display: Use formatConcentrationDisplay() from @odysseus/shared-schemas
 * - For parsing: Use parseConcentration() from @odysseus/shared-schemas (via Zod preprocessor)
 * 
 * This file kept for backward compatibility during migration.
 * Will be removed in future cleanup phase.
 */

export function formatToScientificNotation(value: string | number): string {
  if (!value || value === '') return '';
  
  let numValue: number;
  
  if (typeof value === 'string') {
    const normalizedValue = value.toLowerCase().replace('e+', 'e').replace('e-', 'e-');
    numValue = parseFloat(normalizedValue);
  } else {
    numValue = value;
  }
  
  if (isNaN(numValue) || numValue === 0) return value.toString();
  
  const scientific = numValue.toExponential(1);
  const [mantissa, exponent] = scientific.split('e');
  
  const exp = parseInt(exponent);
  const formattedExp = exp >= 0 ? `+${exp.toString().padStart(2, '0')}` : exp.toString().padStart(3, '0');
  
  return `${mantissa}E${formattedExp}`;
}

export function isScientificNotationInput(value: string): boolean {
  return /^\d*\.?\d*[eE][+-]?\d+$/.test(value);
}

export function parseScientificNotation(value: string): number | null {
  if (!value || value === '') return null;
  
  const parsed = parseFloat(value.toLowerCase().replace('e+', 'e').replace('e-', 'e-'));
  return isNaN(parsed) ? null : parsed;
}

export function processConcentrationForStorage(value: string | number | undefined): string | number | undefined {
  if (!value && value !== 0) return undefined;
  
  const strValue = String(value).replace(/,/g, '');
  let numValue: number;
  
  if (isScientificNotationInput(strValue) || strValue.includes('E')) {
    numValue = parseFloat(strValue.toLowerCase().replace('e+', 'e'));
  } else {
    numValue = parseFloat(strValue);
  }
  
  if (isNaN(numValue)) return undefined;
  if (numValue === 0) return 0;
  
  if (numValue >= 1000 || numValue <= 0.001) {
    const scientific = numValue.toExponential(1);
    const [mantissa, exponent] = scientific.split('e');
    const exp = parseInt(exponent);
    
    return `${mantissa}E${exp}`;
  } else {
    return numValue;
  }
}
