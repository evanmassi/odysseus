/**
 * Barcode Sheet Types
 *
 * Shared types for the bulk barcode sheet printing flow (tab, modal, preview).
 */

export interface PrintableLabel {
  itemId: string;
  itemName: string;
  manufacturer?: string;
  catalogNumber?: string;
  /** Set when the label identifies one physical lot rather than the product. */
  lotNumber?: string;
  expirationDate?: string;
  barcodeValue: string;
}
