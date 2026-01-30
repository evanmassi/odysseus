# Label Printing Feature - Implementation Plan

## Overview

Add the ability to print cryogenic tube labels directly from Odysseus. Users select tubes, click "Print Labels," and labels print with all relevant sample data—eliminating double-entry of tube information.

**Label Size:** 1.5" × 0.5"
**Initial Printer Support:** Dymo LabelWriter 450
**Architecture:** Multi-printer abstraction (extensible to Zebra, Brother, browser print, etc.)

---

## Architecture Philosophy

Build a **printer-agnostic abstraction layer** from day one, but only implement the Dymo driver initially. This means:

- Adding a new printer type later = just add a new driver file
- No refactoring of UI, hooks, or business logic
- Each driver handles its own SDK quirks internally

```
┌─────────────────────────────────────────────────────────────┐
│                        PrintService                         │
│  - Manages available drivers                                │
│  - Auto-detects which printers are available                │
│  - Routes print jobs to appropriate driver                  │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │DymoDriver │       │ZebraDriver│       │BrowserDrvr│
   │ (MVP)     │       │ (Future)  │       │ (Future)  │
   └───────────┘       └───────────┘       └───────────┘
```

---

## Label Layout

### Full Label (all fields populated)

```
┌─────────────────────────────────────────┐
│ iPSC-Neuron                             │  Line 1: Cell Type
│ INT-4521 / SRC-882                      │  Line 2: Internal ID / Source ID
│ 2D-Diff, Lot 23A                        │  Line 3: Culture Condition, Lot #
│ 5.0E+6 c/mL  01/29/26  EJM              │  Line 4: Concentration, Date, Initials
└─────────────────────────────────────────┘
```

### Dynamic Line Behavior

Labels adapt based on available data. Empty fields are **omitted entirely**, not printed as blank lines. Remaining content redistributes to fill the label space.

**Example: No ID numbers**
```
┌─────────────────────────────────────────┐
│ iPSC-Neuron                             │  Line 1: Cell Type
│ 2D-Diff, Lot 23A                        │  Line 2: Culture Condition, Lot #
│ 5.0E+6 c/mL  01/29/26  EJM              │  Line 3: Concentration, Date, Initials
└─────────────────────────────────────────┘
```

**Example: Only cell type and date**
```
┌─────────────────────────────────────────┐
│ iPSC-Neuron                             │  Line 1: Cell Type
│ 01/29/26  EJM                           │  Line 2: Date, Initials
└─────────────────────────────────────────┘
```

### Text Sizing

**No truncation.** Dymo's autofit feature handles long text by scaling font size down to fit the label width. The driver should enable autofit for all text objects.

### Configurable Label Size

**Built-in sizes** (based on Diversified Biotech DTCR series):

| ID | Dimensions | Use Case |
|----|------------|----------|
| dtcr-1000 | 1.05" × 0.50" | Small cryovials |
| dtcr-2000 | 1.50" × 0.50" | Standard cryovials **(default)** |
| dtcr-3000 | 1.50" × 0.75" | Large tubes, more vertical space |

**Extensibility:** Users can add custom label sizes via settings. Custom sizes are stored alongside built-in sizes and appear in the same dropdown.

**Storage:** Label size preference stored at lab level (recommended, since labels are shared consumables) with option to override per-user if needed.

The label template system generates templates dynamically based on the selected size dimensions.

---

## Field Mapping

| Label Content | Source Field | Formatter | If Empty |
|---------------|--------------|-----------|----------|
| Cell Type | `tube.sample.cellType` | Direct (autofit) | Omit line |
| Internal ID | `tube.sample.donorInternalId` | Direct (autofit) | Omit from line |
| Source ID | `tube.sample.donorSourceId` | Direct (autofit) | Omit from line |
| Culture Condition | `tube.sample.cultureCondition` | Direct (autofit) | Omit from line |
| Lot # | `tube.sample.lotNumber` | Direct (autofit) | Omit from line |
| Concentration | `tube.sample.concentration` + `concentrationUnit` | `formatConcentrationDisplay()` | Omit from line |
| Date | `tube.sample.date` | Format as MM/DD/YY | Omit from line |
| Initials | `tube.researcherId` → lookup researcher | `getUserInitials()` | Omit from line |

### Line Composition Logic

Lines are built dynamically. If all fields for a line are empty, the entire line is omitted.

| Line | Fields | Omit Line If... |
|------|--------|-----------------|
| Line 1 | Cell Type | No cell type |
| Line 2 | Internal ID / Source ID | Both IDs empty |
| Line 3 | Culture Condition, Lot # | Both empty |
| Line 4 | Concentration, Date, Initials | All three empty |

**No truncation** — Dymo autofit scales text to fit. Long values display in smaller font.

---

## Technical Architecture

### Core Abstraction: PrinterDriver Interface

All printer implementations conform to a common interface. The UI and business logic never know which printer type is being used.

```typescript
interface PrinterDriver {
  /** Unique identifier for this driver type */
  readonly type: PrinterType;

  /** Human-readable name for UI display */
  readonly displayName: string;

  /** Check if this printer system is available (SDK loaded, service running) */
  checkAvailability(): Promise<DriverAvailability>;

  /** Get list of available printers of this type */
  getPrinters(): Promise<PrinterInfo[]>;

  /** Print labels to specified printer */
  print(labels: LabelData[], printerName: string): Promise<PrintResult>;
}

type PrinterType = 'dymo' | 'zebra' | 'brother' | 'browser';

interface DriverAvailability {
  available: boolean;
  reason?: string;  // "SDK not loaded", "Service not running", etc.
}

interface PrinterInfo {
  name: string;
  driverType: PrinterType;
  model?: string;
  isConnected: boolean;
}
```

### PrintService: The Orchestrator

The `PrintService` manages all registered drivers and provides a unified API to the UI.

```typescript
class PrintService {
  private drivers: Map<PrinterType, PrinterDriver>;

  /** Register a driver (called at app init) */
  registerDriver(driver: PrinterDriver): void;

  /** Check all drivers for availability, return available printers */
  discoverPrinters(): Promise<PrinterInfo[]>;

  /** Print to a specific printer (routes to correct driver) */
  print(labels: LabelData[], printer: PrinterInfo): Promise<PrintResult>;

  /** Get availability status for a specific driver type */
  getDriverStatus(type: PrinterType): Promise<DriverAvailability>;
}
```

### MVP: Dymo Driver Only

For the initial implementation, we only build the `DymoDriver`. The abstraction exists, but there's only one driver registered.

**Dymo SDK Details:**
- Uses **DYMO Label Framework** JavaScript SDK
- Requires **Dymo Label Software** installed (provides localhost web service)
- SDK communicates via HTTP to `localhost:41951` (or HTTPS on `41952`)
- Uses XML-based label templates

### Flow Diagram

```
User selects tubes → Click "Print Labels"
                            ↓
                    PrintService.discoverPrinters()
                            ↓
                    [DymoDriver.checkAvailability()]
                    [ZebraDriver.checkAvailability()]  ← Future
                    [BrowserDriver.checkAvailability()] ← Future
                            ↓
                    Any printers found?
                     /            \
                   Yes             No
                    ↓               ↓
            Show print modal    Show error:
            (list all printers) "No printers detected"
                    ↓
            User selects printer & clicks Print
                    ↓
            PrintService.print(labels, selectedPrinter)
                    ↓
            Routes to correct driver based on printer.driverType
                    ↓
            Show success/failure
```

---

## Files to Create

### 1. Core Types & Interfaces

**`client/src/domains/printing/types/index.ts`**

The foundation—defines all shared types and the driver interface.

```typescript
// === Driver Interface (all printer drivers implement this) ===

type PrinterType = 'dymo' | 'zebra' | 'brother' | 'browser';

interface PrinterDriver {
  readonly type: PrinterType;
  readonly displayName: string;
  checkAvailability(): Promise<DriverAvailability>;
  getPrinters(): Promise<PrinterInfo[]>;
  print(label: LabelLines, printerName: string, options: PrintOptions): Promise<PrintResult>;
}

interface DriverAvailability {
  available: boolean;
  reason?: string;
}

// === Label Size Configuration ===

interface LabelSize {
  id: string;      // Unique identifier
  width: number;   // inches
  height: number;  // inches
  name: string;    // Display name, e.g., "1.50 × 0.50 inch"
  isCustom?: boolean;  // true if user-defined
}

// Built-in sizes (based on Diversified Biotech DTCR series)
const BUILT_IN_LABEL_SIZES: LabelSize[] = [
  { id: 'dtcr-1000', width: 1.05, height: 0.50, name: '1.05" × 0.50"' },  // Small vials
  { id: 'dtcr-2000', width: 1.50, height: 0.50, name: '1.50" × 0.50"' },  // Standard (default)
  { id: 'dtcr-3000', width: 1.50, height: 0.75, name: '1.50" × 0.75"' },  // Large tubes
];

const DEFAULT_LABEL_SIZE_ID = 'dtcr-2000';

// Users can add custom sizes (stored in lab or user settings)
// Example custom size:
// { id: 'custom-1', width: 2.0, height: 0.5, name: '2.00" × 0.50"', isCustom: true }

interface PrintOptions {
  labelSize: LabelSize;
  copies: number;  // 1-50, default 1
}

// === Shared Types ===

interface PrinterInfo {
  name: string;
  driverType: PrinterType;
  model?: string;
  isConnected: boolean;
}

interface PrintResult {
  success: boolean;
  printedCount: number;
  failedCount: number;
  error?: string;
}

// Label content - dynamic lines (undefined = omit line)
interface LabelLines {
  line1?: string;  // Cell Type
  line2?: string;  // Internal ID / Source ID
  line3?: string;  // Culture Condition, Lot #
  line4?: string;  // Concentration, Date, Initials
}
```

### 2. Print Service (Orchestrator)

**`client/src/domains/printing/services/PrintService.ts`**

The central service that manages drivers and routes print jobs.

```typescript
class PrintService {
  private drivers: Map<PrinterType, PrinterDriver> = new Map();
  private static instance: PrintService;

  static getInstance(): PrintService;

  registerDriver(driver: PrinterDriver): void;

  async discoverPrinters(): Promise<PrinterInfo[]>;

  async print(labels: LabelData[], printer: PrinterInfo): Promise<PrintResult>;

  async getDriverStatus(type: PrinterType): Promise<DriverAvailability>;
}
```

### 3. Dymo Driver (MVP Implementation)

**`client/src/domains/printing/drivers/DymoDriver.ts`**

The only driver we implement for now. Encapsulates all Dymo SDK specifics.

```typescript
class DymoDriver implements PrinterDriver {
  readonly type = 'dymo';
  readonly displayName = 'Dymo LabelWriter';

  private sdk: DymoFramework | null = null;

  async checkAvailability(): Promise<DriverAvailability>;
  async getPrinters(): Promise<PrinterInfo[]>;
  async print(labels: LabelData[], printerName: string): Promise<PrintResult>;

  // Private Dymo-specific methods
  private loadSdk(): Promise<void>;
  private createLabelXml(label: LabelData): string;
}
```

### 4. Future Driver Stubs (Optional, for illustration)

**`client/src/domains/printing/drivers/ZebraDriver.ts`** (Future)
**`client/src/domains/printing/drivers/BrotherDriver.ts`** (Future)
**`client/src/domains/printing/drivers/BrowserDriver.ts`** (Future - fallback)

These don't need to be created now—just showing where they'd go:

```typescript
// Example: BrowserDriver would use window.print() as universal fallback
class BrowserDriver implements PrinterDriver {
  readonly type = 'browser';
  readonly displayName = 'System Printer';

  async checkAvailability() {
    return { available: true }; // Always available
  }

  async print(labels: LabelData[], printerName: string) {
    // Generate print-friendly HTML, call window.print()
  }
}
```

### 5. Label Template (Dymo-specific)

**`client/src/domains/printing/templates/dymo/cryoTubeLabel.ts`**

Dymo uses XML templates. This file exports the template for 1.5" × 0.5" labels.

```typescript
// Returns XML string with placeholder tokens for label fields
export function getCryoTubeLabelTemplate(): string;

// Populates template with actual data
export function populateLabelTemplate(template: string, data: LabelData): string;
```

Note: Template is Dymo-specific, so it lives under `templates/dymo/`. Future Zebra ZPL templates would go in `templates/zebra/`.

### 6. Label Data Formatter (Shared)

**`client/src/domains/printing/utils/labelFormatter.ts`**

Transforms tube data into label lines. Handles dynamic line omission.

```typescript
// Label line structure - each line is optional
interface LabelLines {
  line1?: string;  // Cell Type
  line2?: string;  // "IntID / SrcID" or just one if other is empty
  line3?: string;  // "CultureCond, Lot#" or just one if other is empty
  line4?: string;  // "Conc  Date  Initials" - any combo of present fields
}

// Main formatter - returns only the lines that have content
function formatTubeForLabel(tube: TubeData, researcher?: Researcher): LabelLines;

// Helper: format date as MM/DD/YY
function formatLabelDate(isoDate: string | undefined): string;

// Helper: build line from parts, joining with separator
function buildLine(parts: (string | undefined)[], separator: string): string | undefined;

// Helper: get initials from researcher
function getResearcherInitials(researcher?: Researcher): string | undefined;
```

**No truncation helpers needed** — Dymo autofit handles long text.

### 7. Print Labels Hook

**`client/src/domains/printing/hooks/usePrintLabels.ts`**

React hook that wraps `PrintService` for component use.

```typescript
interface UsePrintLabelsReturn {
  // State
  availablePrinters: PrinterInfo[];
  selectedPrinter: PrinterInfo | null;
  isPrinting: boolean;
  isDiscovering: boolean;
  error: string | null;
  lastResult: PrintResult | null;

  // Actions
  discoverPrinters: () => Promise<void>;
  selectPrinter: (printer: PrinterInfo) => void;
  printLabels: (tubeIds: string[]) => Promise<void>;
  clearError: () => void;
}
```

### 8. Print Label Modal

**`client/src/domains/tubes/ui/components/modals/PrintLabelModal.tsx`**

UI for printing a single tube label. Knows nothing about specific printer types.

#### UI Primitives to Use

The modal should use existing primitives for visual consistency:

| Element | Primitive | Import From |
|---------|-----------|-------------|
| Modal wrapper | `BaseModal` | `@shared/ui/components/modals/BaseModal` |
| Printer dropdown | `Select` | `@shared/ui/primitives/select/Select` |
| Label size dropdown | `Select` | `@shared/ui/primitives/select/Select` |
| Copies input | `NumberInput` | `@shared/ui/primitives/input/NumberInput` |
| Print/Cancel/Retry/Done buttons | `Button` | `@shared/ui/primitives/button/Button` |
| Loading spinner | `Spinner` | `@shared/ui/components/loading/Spinner` |
| Error/warning messages | `AlertBanner` | `@shared/ui/primitives/alert-banner/AlertBanner` |
| Success message | `AlertBanner` | (variant="success") |
| Info tooltips | `Tooltip` | `@shared/ui/primitives/tooltip/Tooltip` |

#### New Components (minimal)

| Component | Purpose | Complexity |
|-----------|---------|------------|
| `LabelPreview` | Visual preview of label content | Simple styled div |
| Progress text | "Printing 3 of 10..." | Inline text, no component needed |

#### Modal Structure

```tsx
<BaseModal
  isOpen={isOpen}
  onClose={onClose}
  title="Print Label"
  icon={<Printer size={20} />}
  size="sm"
  footer={
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button onClick={handlePrint} disabled={isPrinting}>
        {isPrinting ? 'Printing...' : 'Print'}
      </Button>
    </div>
  }
>
  {state === 'discovering' && (
    <div className="flex items-center justify-center py-8">
      <Spinner size="md" />
      <span className="ml-2 text-muted-foreground">Detecting printer...</span>
    </div>
  )}

  {state === 'ready' && (
    <>
      <LabelPreview lines={labelLines} />

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Select
          label="Printer"
          options={printerOptions}
          value={selectedPrinter}
          onChange={setSelectedPrinter}
        />
        <Select
          label="Label Size"
          options={labelSizeOptions}
          value={selectedSize}
          onChange={setSelectedSize}
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium">Copies</label>
        <NumberInput
          value={copies}
          onChange={setCopies}
          min={1}
          max={50}
          size="md"
        />
      </div>
    </>
  )}

  {state === 'error' && (
    <AlertBanner
      variant="error"
      title="Failed to send to printer"
      actions={<Button size="sm" onClick={retry}>Retry</Button>}
    >
      {errorMessage}
    </AlertBanner>
  )}

  {state === 'success' && (
    <AlertBanner variant="success">
      {copies} label{copies > 1 ? 's' : ''} sent to printer
    </AlertBanner>
  )}
</BaseModal>
```

**Props:**
```typescript
interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  tubeId: string;  // Single tube ID
}
```

**UI States:**
1. **Discovering** - "Detecting printer..." (brief, usually <1 second)
2. **No Printers** - "No printer detected" + troubleshooting tips
3. **Ready** - Shows:
   - Label preview (visual representation of what will print)
   - Printer name (or dropdown if multiple)
   - Label size indicator (e.g., "1.5" × 0.5"")
   - **Copies selector** (number input, default 1, max ~50)
   - "Print" button
4. **Printing** - Progress: "Printing label 3 of 10..."
5. **Success** - "Labels sent to printer!" (auto-close after 1-2 seconds, or toast)
6. **Error** - Error message + "Retry" button

**Multiple Copies:**
Users commonly freeze 3-20 identical tubes at once. The modal includes a copies selector:
```
┌─────────────────────────────────────────────┐
│  Copies: [ 1 ]  [-] [+]                     │
└─────────────────────────────────────────────┘
```
- Default: 1
- Min: 1, Max: 50 (reasonable upper bound)
- Prints the same label N times sequentially

**Label Preview:**
Shows a visual mock of the label with the actual tube data:
```
┌─────────────────────────────────┐
│ iPSC-Neuron                     │
│ INT-4521 / SRC-882              │
│ 2D-Diff, Lot 23A                │
│ 5.0E+6 c/mL  01/29/26  EJM      │
└─────────────────────────────────┘
```

This helps users confirm the right tube before printing.

**Success Messaging:**
Use "sent to printer" rather than "printed" — we can confirm the job was sent, but can't guarantee the physical label printed correctly (paper jam, out of labels, etc.).

### 9. App Initialization

**`client/src/domains/printing/init.ts`**

Called at app startup to register available drivers.

```typescript
export function initializePrintService(): void {
  const printService = PrintService.getInstance();

  // Register Dymo driver (MVP)
  printService.registerDriver(new DymoDriver());

  // Future: Register additional drivers
  // printService.registerDriver(new ZebraDriver());
  // printService.registerDriver(new BrowserDriver());
}
```

---

## UI Entry Points

### Single-Tube Restriction

**Print is only available when exactly ONE filled tube is selected.**

Rationale: Batch printing multiple different labels doesn't match the lab workflow. Users print labels one at a time as they're preparing individual tubes. The system creates tubes (which can be done in bulk), then the user prints labels for each.

### Entry Point 1: Context Menu

**`client/src/shared/ui/primitives/ContextMenu.tsx`**

Add "Print Label" option (singular, since single tube only):

```typescript
// New props
canPrintLabel?: boolean;  // true only when exactly 1 filled tube selected
onPrintLabel?: () => void;

// New menu item (after Lock section, before Delete)
{canPrintLabel && (
  <MenuItem
    icon={Printer}
    label="Print Label"
    onClick={() => {
      onPrintLabel?.();
      closeMenu();
    }}
  />
)}
```

### Entry Point 2: AppHeader Contextual Button

**`client/src/app/components/layout/AppHeader.tsx`**

Add a ghost-styled "Print" button that appears contextually when a single filled tube is selected. Follows the existing pattern for Edit, Copy, Lock, etc.

```typescript
// In the action toolbar section, after the Lock/Unlock/Share buttons
// Only show when exactly 1 filled tube is selected
{selectionAnalysis.hasFilled &&
 selectionAnalysis.filledPositions.size === 1 && (
  <>
    <div className="w-px h-4 bg-border mx-0.5"></div>
    <Tooltip content="Print label for this tube" side="bottom">
      <Button
        variant="ghost"
        size="xs"
        onClick={gridController.printLabel}
        leftIcon={<Printer className="w-3 h-3" />}
      >
        Print
      </Button>
    </Tooltip>
  </>
)}
```

**GridController interface update:**
```typescript
interface GridController {
  // ... existing props
  printLabel?: () => void;  // New: opens print modal for selected tube
}
```

### No Access Restrictions

**Anyone can print labels for any tube.** There's no lock/permission check for printing.

- Users in view-only spaces CAN print labels (they just can't modify the tube data)
- Users CAN print labels for tubes locked by others
- The only restriction is that users can only CREATE new tubes in their own resources

This makes sense because printing a label doesn't modify the tube data—it's a read-only operation.

---

## Files to Modify

### 1. Context Menu

**`client/src/shared/ui/primitives/ContextMenu.tsx`**

- Add `canPrintLabel` and `onPrintLabel` props
- Add "Print Label" menu item (only shown for single tube selection)
- Import `Printer` icon from lucide-react

### 2. AppHeader

**`client/src/app/components/layout/AppHeader.tsx`**

- Add "Print" button to contextual toolbar
- Only visible when `filledPositions.size === 1`
- Wire to `gridController.printLabel`
- Import `Printer` icon from lucide-react

### 3. TubeGrid Component

**`client/src/domains/tubes/ui/components/grid/TubeGrid.tsx`**

- Add `printLabel` handler to grid controller
- Pass `canPrintLabel` and `onPrintLabel` to ContextMenu
- Open PrintLabelsModal when triggered
- Pass selected tube ID to modal

### 4. Dashboard (props threading)

**`client/src/app/components/layout/Dashboard.tsx`**

- Add `printLabel` to gridController passed to AppHeader

### 5. Package.json / Index.html

May need to add Dymo SDK script tag or npm package reference.

---

## Folder Structure

```
client/src/domains/printing/
├── drivers/                      # Printer-specific implementations
│   ├── DymoDriver.ts             # MVP: Dymo LabelWriter driver
│   ├── ZebraDriver.ts            # Future: Zebra ZPL driver
│   ├── BrotherDriver.ts          # Future: Brother SDK driver
│   ├── BrowserDriver.ts          # Future: window.print() fallback
│   └── index.ts
├── services/
│   ├── PrintService.ts           # Central orchestrator
│   └── index.ts
├── hooks/
│   ├── usePrintLabels.ts         # React hook for components
│   └── index.ts
├── templates/                    # Printer-specific label templates
│   ├── dymo/
│   │   └── cryoTubeLabel.ts      # XML template for Dymo
│   ├── zebra/                    # Future: ZPL templates
│   └── index.ts
├── utils/
│   ├── labelFormatter.ts         # Shared: TubeData → LabelData
│   └── index.ts
├── types/
│   └── index.ts                  # PrinterDriver interface, shared types
├── init.ts                       # Register drivers at app startup
└── index.ts                      # Domain barrel export
```

### What Gets Built for MVP

```
client/src/domains/printing/
├── drivers/
│   ├── DymoDriver.ts             ✅ Build this
│   └── index.ts                  ✅ Build this
├── services/
│   ├── PrintService.ts           ✅ Build this
│   └── index.ts                  ✅ Build this
├── hooks/
│   ├── usePrintLabels.ts         ✅ Build this
│   └── index.ts                  ✅ Build this
├── templates/
│   ├── dymo/
│   │   └── cryoTubeLabel.ts      ✅ Build this
│   └── index.ts                  ✅ Build this
├── utils/
│   ├── labelFormatter.ts         ✅ Build this
│   └── index.ts                  ✅ Build this
├── types/
│   └── index.ts                  ✅ Build this
├── init.ts                       ✅ Build this
└── index.ts                      ✅ Build this
```

---

## Edge Cases & Error Scenarios

### Printer Detection

| Scenario | Behavior |
|----------|----------|
| No drivers detect any printers | Show error: "No printers detected. Please connect a label printer." |
| Dymo software not installed | Dymo driver returns unavailable; other drivers may still work |
| Dymo service not running | Dymo driver returns unavailable with reason |
| Printer offline/disconnected | Show in list as disconnected, disable selection |
| Multiple printers (same type) | Show all in dropdown with model names |
| Multiple printers (different types) | Show all in dropdown, grouped by type |
| Only browser fallback available | Future: Show "System Printer" option |

### Label Data

| Scenario | Behavior |
|----------|----------|
| Missing cell type | Omit line 1 entirely |
| Missing both IDs | Omit line 2 entirely |
| Missing culture condition AND lot # | Omit line 3 entirely |
| Missing concentration, date, AND researcher | Omit line 4 entirely |
| Missing researcher only | Line 4 shows concentration and date only |
| Very long cell type | Dymo autofit shrinks font to fit (no truncation) |
| Very long any field | Dymo autofit handles it |
| All fields empty except cell type | Single-line label with just cell type |

### Print Process

| Scenario | Behavior |
|----------|----------|
| Print success (1 copy) | Success toast: "Label sent to printer", modal auto-closes |
| Print success (N copies) | Success toast: "10 labels sent to printer", modal auto-closes |
| Print failure | Error message in modal, "Retry" button |
| Partial failure (5 of 10 sent) | Error: "5 of 10 labels sent. Retry remaining?" |
| User cancels during print | Stop remaining, show "3 of 10 labels sent" |
| Label jam / paper out | Dymo SDK reports error, show to user with troubleshooting |
| Dymo service crashes mid-print | Error: "Lost connection to printer. Please retry." |

### Selection States

| Scenario | Behavior |
|----------|----------|
| No selection | "Print Label" not shown in context menu or header |
| Empty position selected | "Print Label" not shown |
| Multiple tubes selected | "Print Label" not shown (single tube only) |
| Single filled tube selected | "Print Label" shown in both context menu and header |
| View-only space, single tube | "Print Label" IS shown (printing is read-only) |
| Locked tube by another user | "Print Label" IS shown (printing doesn't modify) |

---

## User Experience Flow

### Happy Path

1. User clicks on a single tube in the grid
2. "Print" button appears in AppHeader toolbar (or right-click → "Print Label")
3. User clicks "Print"
4. Modal opens, shows "Detecting printer..."
5. Printer found → shows label preview + "Print to [Printer Name]" button
6. User clicks "Print"
7. Label prints
8. Success toast: "Label printed successfully"
9. Modal closes automatically (or user clicks "Done")

### Error Path

1. User clicks "Print" on a tube
2. Modal opens, shows "Detecting printer..."
3. Printer not found → shows error message with troubleshooting steps:
   - "Make sure Dymo Label Software is running"
   - "Check that the printer is connected via USB"
4. User clicks "Retry" (after fixing) or "Cancel"

### Label Size Selection (Optional)

If implementing label size configuration:
1. Modal shows current label size (e.g., "1.5" × 0.5"")
2. User can click to change size (dropdown or settings)
3. Label preview updates to show new layout
4. Selection is remembered for next time

---

## Testing Considerations

### Unit Tests

- `labelFormatter.ts` - 52 tests covering field transformations and missing data ✅
- `DymoDriver.ts` - 22 tests with mock SDK, error handling, preview rendering ✅
- `cryoTubeLabel.ts` - 17 tests for XML generation, escaping, dimensions ✅

### Integration Tests

- Mock Dymo SDK responses
- Test full flow from selection to print completion
- Test error states

### Manual Testing

- Actual Dymo 450 with real labels
- Test label alignment and readability at 6-7pt font
- Test with various data lengths
- Test batch printing (10, 50, 100 labels)

---

## Implementation Order

### Phase 1: Foundation & Abstraction Layer ✅ COMPLETE

**Goal:** Build the architecture that all printers will use.

- [x] Create `printing` domain folder structure
- [x] Define `PrinterDriver` interface and shared types (`types/index.ts`)
- [x] Create `PrintService` orchestrator (`services/PrintService.ts`)
- [x] Create `labelFormatter` utility (`utils/labelFormatter.ts`)
- [x] Write unit tests for formatter (52 tests)
- [x] Create `init.ts` for driver registration

### Phase 2: Dymo Driver ✅ COMPLETE

**Goal:** Implement the first (and only MVP) driver.

- [x] Research Dymo SDK integration details
- [x] Create `DymoDriver` implementing `PrinterDriver` interface
- [x] Create Dymo XML label template (`templates/dymo/cryoTubeLabel.ts`)
- [x] Register `DymoDriver` in `init.ts`
- [x] Write unit tests for driver and template (33 tests)
- [ ] Manual testing with real Dymo 450 printer (deferred - no printer available)
- [ ] Iterate on label template until layout is correct (deferred)

**Implementation Notes:**
- SDK loaded lazily from `labelwriter.com/software/dls/sdk/js/dymo.connect.framework.js`
- Uses `AlwaysFit` text mode for automatic font scaling
- Dimensions converted to twips (1 inch = 1440 twips)
- Dependency injection pattern for testability

### Phase 3: UI Integration ✅ COMPLETE

**Goal:** Connect printing to the tube grid.

- [x] Create `usePrintLabels` hook
- [x] Create `PrintLabelModal` component
- [x] Create `LabelPreview` component (visual mock of label content)
- [x] Modify `ContextMenu.tsx` to add "Print Label" option
- [x] Add "Print" button to `AppHeader.tsx` contextual toolbar
- [x] Wire up `TubeGrid.tsx` to open modal with selected tube
- [x] Add `printLabelModal` to `modalStore.ts`
- [x] Add SDK preview rendering for visual testing without printer
- [ ] End-to-end testing of full flow (requires printer)

**SDK Preview Feature:** Added `renderPreview()` method to `PrinterDriver` interface and `DymoDriver`. The `PrintLabelModal` now shows SDK-rendered PNG preview when available (with "(SDK Preview)" label), falling back to text-based preview when SDK is unavailable. This allows developers to verify label layout visually without a physical printer.

### Phase 4: Polish & Error Handling

**Goal:** Handle edge cases gracefully.

- [ ] Refine error messages for all failure scenarios
- [ ] Add batch printing progress feedback
- [ ] Test with various data edge cases (missing fields, long values)
- [ ] Test batch sizes (1, 10, 50, 100 labels)
- [ ] Documentation

### Future Phases (Not MVP)

**Phase 5: Custom Label Size Management**
- [ ] Add "Printing" section to Admin Settings
- [ ] UI to add/edit/delete custom label sizes
- [ ] Validation (reasonable dimensions, unique names)
- [ ] Store custom sizes in lab configuration

**Phase 6: Browser Fallback Driver**
- [ ] Create `BrowserDriver` using `window.print()`
- [ ] Create print-friendly CSS for label layout
- [ ] Register as fallback when no other printers detected

**Phase 7: Additional Printer Support**
- [ ] Zebra ZPL driver (if needed)
- [ ] Brother SDK driver (if needed)

---

## Dependencies

### Required

- **Dymo Label Software** - must be installed on lab computers
- **dymo.label.framework.js** - Dymo's JavaScript SDK

### Notes

- The Dymo SDK uses HTTP to communicate with the local Dymo service
- HTTPS pages may have issues calling HTTP localhost (mixed content)
- May need to run on HTTP in lab environment, or use Dymo's HTTPS certificate workaround

---

## Technical Considerations

### 1. SDK Lazy Loading

The Dymo SDK should **not** be loaded on app startup—most users won't print during a session.

**Strategy:**
- Load SDK dynamically when `PrintLabelModal` opens for the first time
- Cache the loaded SDK for subsequent prints
- First print has ~1-2 second additional latency (SDK load + service detection)
- Subsequent prints are instant

```typescript
class DymoDriver {
  private sdkLoaded = false;
  private sdkPromise: Promise<void> | null = null;

  private async ensureSdkLoaded(): Promise<void> {
    if (this.sdkLoaded) return;
    if (!this.sdkPromise) {
      this.sdkPromise = this.loadSdk();
    }
    await this.sdkPromise;
    this.sdkLoaded = true;
  }
}
```

### 2. Testability (Dependency Injection)

The `DymoDriver` should accept the SDK as a constructor parameter for testability:

```typescript
interface DymoSdk {
  // Subset of Dymo SDK methods we use
  checkEnvironment(): Promise<boolean>;
  getPrinters(): DymoPrinterInfo[];
  printLabel(template: string, printerName: string): Promise<void>;
}

class DymoDriver implements PrinterDriver {
  constructor(private sdk?: DymoSdk) {}

  // In production: this.sdk ?? await loadRealSdk()
  // In tests: pass mock SDK via constructor
}
```

**Testing approach:**
- Unit tests use mock SDK (no hardware needed)
- CI runs without Dymo service—driver reports "unavailable"
- Manual testing with real printer for template tuning

### 3. Researcher Data Lookup

To display initials on the label, we need researcher data.

**Current state:**
- `TubeData` has `researcherId` (just the ID) and `createdByName` (snapshot of creator)
- `useResearchersQuery()` / `useActiveResearchersQuery()` provides cached researcher list
- Researcher data is already loaded for dropdowns, so cache is warm

**Approach:**
```typescript
// In PrintLabelModal or usePrintLabels hook
const { data: researchers } = useActiveResearchersQuery();
const researcher = researchers?.find(r => r.id === tube.researcherId);
const initials = researcher
  ? getUserInitials(researcher.email, researcher.firstName, researcher.lastName)
  : '';
```

**Fallback:** If researcher not found (deleted, deactivated, or ID is null), print with blank initials. This is fine—the label still prints, just without that field.

### 4. Print Result Wording

Dymo SDK confirms job was sent, but can't guarantee physical print succeeded.

| Scenario | What we know | What we say |
|----------|--------------|-------------|
| SDK returns success | Job sent to printer | "Labels sent to printer" |
| SDK returns error | Job failed | Show specific error |
| Printer out of labels | SDK may not detect | User must visually verify |

**Recommendation:** Use "sent to printer" language. Don't claim "printed successfully" when we can't verify the physical result.

---

## Open Questions

1. **Label template fine-tuning** - Exact positions for autofit text objects need iteration with real labels
2. **HTTPS/HTTP mixed content** - If app runs on HTTPS, may need workaround for Dymo's HTTP service
3. **Driver auto-loading** - Should drivers load their SDKs lazily, or at app init?
4. **Printer memory** - Should we remember the user's last-used printer? (Nice to have)
5. **Label size storage** - Where to store the preferred label size?
   - **Option A:** Lab-level setting (all users in lab use same labels)
   - **Option B:** User preference (each user can have their own)
   - **Recommendation:** Lab-level default, with user override option
6. **Label preview styling** - How closely should the preview match the real label? (Good enough vs pixel-perfect)
7. **Custom size UI** - Where do users manage custom label sizes?
   - **Option A:** In print modal (gear icon → "Manage sizes")
   - **Option B:** In lab/admin settings under a "Printing" section
   - **Recommendation:** Admin settings for MVP, can add inline access later

---

## Adding Future Drivers

When you need to support a new printer type, here's exactly what to do:

### Example: Adding Zebra Support

1. **Create the driver:**
   ```
   client/src/domains/printing/drivers/ZebraDriver.ts
   ```

2. **Implement the interface:**
   ```typescript
   class ZebraDriver implements PrinterDriver {
     readonly type = 'zebra';
     readonly displayName = 'Zebra';

     async checkAvailability() { /* Zebra Browser Print SDK check */ }
     async getPrinters() { /* Get Zebra printers */ }
     async print(labels, printerName) { /* Send ZPL to printer */ }
   }
   ```

3. **Create ZPL template (if needed):**
   ```
   client/src/domains/printing/templates/zebra/cryoTubeLabel.ts
   ```

4. **Register the driver:**
   ```typescript
   // In init.ts
   printService.registerDriver(new ZebraDriver());
   ```

That's it. The UI, hooks, and `PrintService` don't change at all.

---

## Estimated Scope

| Component | Complexity | Notes |
|-----------|------------|-------|
| Types & `PrinterDriver` interface | Low | Foundation for everything |
| `PrintService` orchestrator | Low-Medium | Simple routing logic |
| `labelFormatter` utility | Low | Uses existing formatters |
| `DymoDriver` implementation | Medium | Learning Dymo SDK |
| Dymo label template (XML) | Medium | Trial and error with real labels |
| `usePrintLabels` hook | Low-Medium | Standard React hook |
| `PrintLabelsModal` | Medium | Multiple UI states |
| Context menu modification | Low | Add one menu item |
| TubeGrid wiring | Low | Pass handler, open modal |
| Testing & polish | Medium | Edge cases, batch testing |

**Total: Medium complexity feature**

### Effort Breakdown

| Phase | Effort | Status |
|-------|--------|--------|
| Phase 1: Foundation | ~20% | ✅ Complete |
| Phase 2: Dymo Driver | ~35% | ✅ Complete |
| Phase 3: UI Integration | ~30% | Pending |
| Phase 4: Polish | ~15% | Pending |

### Main Unknowns

1. **Dymo SDK quirks** — each SDK has its own learning curve
2. **Label template precision** — getting 6-7pt text positioned correctly takes iteration
3. **HTTPS mixed content** — may need workaround if app runs on HTTPS
4. **Batch performance** — large batches may need throttling

### Benefits of Abstraction (Future Work)

Adding a new printer type later would only require:
1. Create new driver file (~100-200 lines)
2. Create template file if needed (~50 lines)
3. Register in `init.ts` (1 line)

No changes to UI, hooks, or `PrintService`. This is why the abstraction is worth building now.
