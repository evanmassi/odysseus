/**
 * Scientific notation utilities for concentration display formatting
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
  const formattedExp =
    exp >= 0 ? `+${exp.toString().padStart(2, '0')}` : exp.toString().padStart(3, '0');

  return `${mantissa}E${formattedExp}`;
}

export function isScientificNotationInput(value: string): boolean {
  return /^\d*\.?\d*[eE][+-]?\d+$/.test(value);
}
