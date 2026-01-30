/**
 * Dymo Cryo Tube Label Template
 *
 * Generates XML label definitions dynamically based on LabelSize dimensions.
 * Supports 1-4 text lines with autofit. Lines with undefined content are omitted.
 */

import type { LabelSize, LabelLines } from '../../types';

const TWIPS_PER_INCH = 1440;

/** Margin from label edge in twips */
const MARGIN = 72;

/** Spacing between text lines in twips */
const LINE_SPACING = 36;

interface TextObjectConfig {
  name: string;
  text: string;
  y: number;
  height: number;
  width: number;
  fontSize: number;
}

function inchesToTwips(inches: number): number {
  return Math.round(inches * TWIPS_PER_INCH);
}

function createTextObject(config: TextObjectConfig): string {
  const { name, text, y, height, width, fontSize } = config;

  return `    <ObjectInfo>
      <TextObject>
        <Name>${name}</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
        <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Middle</VerticalAlignment>
        <TextFitMode>AlwaysFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${escapeXml(text)}</String>
            <Attributes>
              <Font Family="Arial" Size="${fontSize}" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="${MARGIN}" Y="${y}" Width="${width}" Height="${height}"/>
    </ObjectInfo>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calculates font size based on label height and line count.
 * Larger labels or fewer lines = bigger font.
 */
function calculateFontSize(labelHeightTwips: number, lineCount: number): number {
  const availableHeight = labelHeightTwips - MARGIN * 2;
  const heightPerLine = availableHeight / lineCount;

  // Font size in points - twips / 20 gives points, then scale down for readability
  // Target roughly 70% of line height as font size
  const fontSize = Math.floor((heightPerLine / 20) * 0.7);

  // Clamp between 6 and 14 points for readability on small labels
  return Math.max(6, Math.min(14, fontSize));
}

/**
 * Generates Dymo label XML from label lines and size configuration.
 * Empty lines are omitted entirely, and remaining content redistributes.
 */
export function generateLabelXml(lines: LabelLines, size: LabelSize): string {
  const widthTwips = inchesToTwips(size.width);
  const heightTwips = inchesToTwips(size.height);

  // Collect non-empty lines
  const activeLines: { name: string; text: string }[] = [];
  if (lines.line1) activeLines.push({ name: 'Line1', text: lines.line1 });
  if (lines.line2) activeLines.push({ name: 'Line2', text: lines.line2 });
  if (lines.line3) activeLines.push({ name: 'Line3', text: lines.line3 });
  if (lines.line4) activeLines.push({ name: 'Line4', text: lines.line4 });

  if (activeLines.length === 0) {
    // Return empty label template if no content
    return createEmptyLabelXml(widthTwips, heightTwips);
  }

  const fontSize = calculateFontSize(heightTwips, activeLines.length);
  const textWidth = widthTwips - MARGIN * 2;

  // Calculate line heights to distribute evenly
  const totalTextHeight = heightTwips - MARGIN * 2;
  const totalSpacing = LINE_SPACING * (activeLines.length - 1);
  const lineHeight = Math.floor((totalTextHeight - totalSpacing) / activeLines.length);

  const textObjects = activeLines.map((line, index) => {
    const y = MARGIN + index * (lineHeight + LINE_SPACING);
    return createTextObject({
      name: line.name,
      text: line.text,
      y,
      height: lineHeight,
      width: textWidth,
      fontSize,
    });
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>CryoTube</Id>
  <PaperName>Custom</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${heightTwips}" Height="${widthTwips}" Rx="0" Ry="0"/>
  </DrawCommands>
${textObjects.join('\n')}
</DieCutLabel>`;
}

function createEmptyLabelXml(widthTwips: number, heightTwips: number): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>CryoTube</Id>
  <PaperName>Custom</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${heightTwips}" Height="${widthTwips}" Rx="0" Ry="0"/>
  </DrawCommands>
</DieCutLabel>`;
}
