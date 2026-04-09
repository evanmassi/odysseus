/**
 * Consumable Application Service
 *
 * Orchestrates all consumable business logic: product CRUD with barcode auto-generation,
 * stock operations, category/location/document management, and bulk operations.
 */

import { nanoid } from 'nanoid';

import type { EventBus } from '@application/contracts/EventBus';
import {
  ConsumableDto,
  type ConsumableCategoryResponse,
  type ConsumableProductResponse,
  type ConsumableProductWithStockResponse,
  type ConsumableProductDetailResponse,
  type ConsumableLocationResponse,
  type ConsumableDocumentResponse,
  type ConsumableBarcodeResponse,
  type ConsumableTransactionResponse,
  type ConsumablePackagingLevelResponse,
} from '@application/dto/ConsumableDto';
import { ConsumableCategory } from '@domain/entities/ConsumableCategory';
import { ConsumableDocument } from '@domain/entities/ConsumableDocument';
import { ConsumableLocation } from '@domain/entities/ConsumableLocation';
import { ConsumableProduct } from '@domain/entities/ConsumableProduct';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  ConsumableProductCreatedEvent,
  ConsumableProductUpdatedEvent,
  ConsumableProductArchivedEvent,
  ConsumableProductDeletedEvent,
  ConsumableCategoryCreatedEvent,
  ConsumableCategoryUpdatedEvent,
  ConsumableCategoryDeletedEvent,
  ConsumableDocumentAddedEvent,
  ConsumableDocumentRemovedEvent,
  ConsumableStockReceivedEvent,
  ConsumableStockConsumedEvent,
  ConsumableStockCountAdjustedEvent,
  ConsumableStockDisposedEvent,
  ConsumableBulkReceivedEvent,
  ConsumableBulkConsumedEvent,
  ConsumableBulkCategoryReassignedEvent,
  ConsumableBulkArchivedEvent,
} from '@domain/events/ConsumableEvents';
import type { ConsumableCategoryRepository } from '@domain/repositories/ConsumableCategoryRepository';
import type { ConsumableLocationRepository } from '@domain/repositories/ConsumableLocationRepository';
import type { ConsumableProductRepository, ConsumableBarcodeRow } from '@domain/repositories/ConsumableProductRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import { generateId } from '@domain/utils/generateId';
import { logger } from '@infrastructure/logging/logger';

import type {
  CreateConsumableCategoryRequest,
  UpdateConsumableCategoryRequest,
  CreateConsumableLocationRequest,
  UpdateConsumableLocationRequest,
  CreateConsumableProductRequest,
  UpdateConsumableProductRequest,
  CreateConsumableBarcodeRequest,
  UpdateConsumableBarcodeRequest,
  CreateConsumableDocumentRequest,
  UpdateConsumableDocumentRequest,
  CreateConsumablePackagingLevelRequest,
  RecordConsumableTransactionRequest,
  RecordConsumableStockCountRequest,
  ConsumableBulkReceiveRequest,
  ConsumableBulkConsumeRequest,
} from '@odysseus/shared-schemas';

interface BulkResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

export class ConsumableApplicationService {
  constructor(
    private categoryRepository: ConsumableCategoryRepository,
    private productRepository: ConsumableProductRepository,
    private locationRepository: ConsumableLocationRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus
  ) {}

  // Categories

  async listCategories(labId: string): Promise<ConsumableCategoryResponse[]> {
    const categories = await this.categoryRepository.findByLabId(labId);
    return categories.map(ConsumableDto.categoryToResponse);
  }

  async createCategory(labId: string, data: CreateConsumableCategoryRequest, user: User): Promise<ConsumableCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);

    if (data.parentId) {
      const parent = await this.categoryRepository.findById(data.parentId, labId);
      if (!parent) throw new NotFoundError('Parent category not found');
      if (parent.parentId) throw new ValidationError('Cannot create subcategory under a subcategory — maximum depth is two levels');
    }

    const category = ConsumableCategory.create({ labId, name: data.name, parentId: data.parentId, sortOrder: data.sortOrder });
    await this.categoryRepository.save(category);
    await this.eventBus.publish(new ConsumableCategoryCreatedEvent(category.id, category.name, category.parentId, user.id, labId));
    return ConsumableDto.categoryToResponse(category);
  }

  async updateCategory(labId: string, id: string, data: UpdateConsumableCategoryRequest, user: User): Promise<ConsumableCategoryResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const category = await this.getCategoryOrThrow(id, labId);
    category.update({ name: data.name, parentId: data.parentId, sortOrder: data.sortOrder });
    await this.categoryRepository.save(category);
    await this.eventBus.publish(new ConsumableCategoryUpdatedEvent(category.id, category.name, user.id, labId));
    return ConsumableDto.categoryToResponse(category);
  }

  async deleteCategory(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const category = await this.getCategoryOrThrow(id, labId);

    const hasProducts = await this.categoryRepository.hasProductsIncludingChildren(id, labId);
    if (hasProducts) throw new ValidationError('Cannot delete category — consumable products are still assigned to it or its subcategories');

    const hasChildren = await this.categoryRepository.hasChildren(id, labId);
    if (hasChildren) {
      const allCategories = await this.categoryRepository.findByLabId(labId);
      const childIds = allCategories.filter(c => c.parentId === id).map(c => c.id);
      for (const childId of childIds) {
        await this.categoryRepository.delete(childId, labId);
      }
    }

    await this.categoryRepository.delete(id, labId);
    await this.eventBus.publish(new ConsumableCategoryDeletedEvent(id, category.name, user.id, labId));
  }

  // Locations

  async listLocations(labId: string): Promise<ConsumableLocationResponse[]> {
    const locations = await this.locationRepository.findByLabId(labId);
    return locations.map(ConsumableDto.locationToResponse);
  }

  async createLocation(labId: string, data: CreateConsumableLocationRequest, user: User): Promise<ConsumableLocationResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const location = ConsumableLocation.create({ labId, name: data.name, description: data.description, sortOrder: data.sortOrder });
    await this.locationRepository.save(location);
    return ConsumableDto.locationToResponse(location);
  }

  async updateLocation(labId: string, id: string, data: UpdateConsumableLocationRequest, user: User): Promise<ConsumableLocationResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const location = await this.getLocationOrThrow(id, labId);
    location.update({ name: data.name, description: data.description, sortOrder: data.sortOrder });
    await this.locationRepository.save(location);
    return ConsumableDto.locationToResponse(location);
  }

  async deleteLocation(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getLocationOrThrow(id, labId);
    const hasStock = await this.locationRepository.hasStock(id);
    if (hasStock) throw new ValidationError('Cannot delete location — it still has stock entries with non-zero quantities');
    await this.locationRepository.delete(id, labId);
  }

  // Products

  async listProducts(labId: string): Promise<ConsumableProductWithStockResponse[]> {
    const productsWithStock = await this.productRepository.findByLabIdWithStock(labId);
    return productsWithStock.map(({ product, totalStock, locationNames }) => ConsumableDto.productWithStockToResponse(product, totalStock, locationNames));
  }

  async getProduct(labId: string, id: string): Promise<ConsumableProductDetailResponse> {
    const product = await this.getProductOrThrow(id, labId);
    const [documents, barcodes, stock, recentTransactions, packagingLevels] = await Promise.all([
      this.productRepository.findDocumentsByProductId(id),
      this.productRepository.findBarcodesByProductId(id),
      this.productRepository.findStockByProductId(id),
      this.productRepository.findTransactionsByProductId(id, 50),
      this.productRepository.findPackagingLevelsByProductId(id),
    ]);
    return ConsumableDto.productDetailToResponse(product, documents, barcodes, stock, recentTransactions, packagingLevels);
  }

  async createProduct(labId: string, data: CreateConsumableProductRequest, user: User): Promise<ConsumableProductResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const category = await this.categoryRepository.findById(data.categoryId, labId);
    if (!category) throw new NotFoundError('Category not found');

    const product = ConsumableProduct.create({ labId, ...data });
    await this.productRepository.save(product);

    await this.generateInternalBarcode(product.id);

    await this.eventBus.publish(new ConsumableProductCreatedEvent(product.id, product.name, product.categoryId, user.id, labId));
    return ConsumableDto.productToResponse(product);
  }

  async updateProduct(
    labId: string, id: string, data: UpdateConsumableProductRequest, user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<ConsumableProductResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const product = await this.getProductOrThrow(id, labId);

    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId, labId);
      if (!category) throw new NotFoundError('Category not found');
    }

    const changes = this.trackProductChanges(product, data);
    product.update(data);
    await this.productRepository.save(product);

    if (changes.length > 0) {
      const event = new ConsumableProductUpdatedEvent(product.id, changes, user.id, labId);
      if (options?.bulkOperation) event.partOfBulkOperation = true;
      await this.eventBus.publish(event);
    }

    return ConsumableDto.productToResponse(product);
  }

  async archiveProduct(
    labId: string, id: string, user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const product = await this.getProductOrThrow(id, labId);

    const hasTransactions = await this.productRepository.hasTransactions(id);
    if (hasTransactions) {
      product.archive();
      await this.productRepository.save(product);
      const event = new ConsumableProductArchivedEvent(product.id, product.name, user.id, labId);
      if (options?.bulkOperation) event.partOfBulkOperation = true;
      await this.eventBus.publish(event);
    } else {
      await this.deleteProduct(labId, id, user);
    }
  }

  async deleteProduct(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const product = await this.getProductOrThrow(id, labId);
    await this.productRepository.delete(id, labId);
    await this.eventBus.publish(new ConsumableProductDeletedEvent(id, product.name, user.id, labId));
  }

  // Documents

  async addDocument(labId: string, productId: string, data: CreateConsumableDocumentRequest, user: User): Promise<ConsumableDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);
    const document = ConsumableDocument.create({ productId, label: data.label, url: data.url, notes: data.notes });
    await this.productRepository.saveDocument(document);
    await this.eventBus.publish(new ConsumableDocumentAddedEvent(productId, data.label, user.id, labId));
    return ConsumableDto.documentToResponse(document);
  }

  async updateDocument(
    labId: string,
    productId: string,
    docId: string,
    data: UpdateConsumableDocumentRequest,
    user: User
  ): Promise<ConsumableDocumentResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);
    await this.productRepository.updateDocument(docId, {
      label: data.label,
      url: data.url,
      notes: data.notes,
    });
    const docs = await this.productRepository.findDocumentsByProductId(productId);
    const updated = docs.find(d => d.id === docId);
    if (!updated) throw new NotFoundError(`Document ${docId} not found`);
    return ConsumableDto.documentToResponse(updated);
  }

  async removeDocument(labId: string, productId: string, docId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);
    await this.productRepository.deleteDocument(docId);
    await this.eventBus.publish(new ConsumableDocumentRemovedEvent(productId, user.id, labId));
  }

  // Barcodes

  async addBarcode(labId: string, productId: string, data: CreateConsumableBarcodeRequest, user: User): Promise<ConsumableBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);

    const existing = await this.productRepository.findByBarcodeValue(data.barcodeValue);
    if (existing) throw new ValidationError(`Barcode "${data.barcodeValue}" is already linked to another product`);

    const barcode: ConsumableBarcodeRow = {
      id: generateId('cbar'),
      productId,
      barcodeValue: data.barcodeValue,
      barcodeType: data.barcodeType,
      isPrimary: data.isPrimary ?? false,
      label: data.label,
    };
    await this.productRepository.saveBarcode(barcode);
    return ConsumableDto.barcodeToResponse(barcode);
  }

  async updateBarcode(
    labId: string,
    productId: string,
    barcodeId: string,
    data: UpdateConsumableBarcodeRequest,
    user: User
  ): Promise<ConsumableBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);
    await this.productRepository.updateBarcode(barcodeId, {
      label: data.label,
      isPrimary: data.isPrimary,
    });
    const barcodes = await this.productRepository.findBarcodesByProductId(productId);
    const updated = barcodes.find(b => b.id === barcodeId);
    if (!updated) throw new NotFoundError(`Barcode ${barcodeId} not found`);
    return ConsumableDto.barcodeToResponse(updated);
  }

  async removeBarcode(labId: string, productId: string, barcodeId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);
    await this.productRepository.deleteBarcode(barcodeId);
  }

  async resolveBarcode(labId: string, barcodeValue: string): Promise<ConsumableProductResponse | null> {
    const barcode = await this.productRepository.findByBarcodeValue(barcodeValue);
    if (!barcode) return null;
    const product = await this.productRepository.findById(barcode.productId, labId);
    if (!product) return null;
    return ConsumableDto.productToResponse(product);
  }

  async regenerateInternalBarcode(labId: string, productId: string, user: User): Promise<ConsumableBarcodeResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);

    const barcodes = await this.productRepository.findBarcodesByProductId(productId);
    const existingInternal = barcodes.find(b => b.barcodeType === 'internal');
    if (existingInternal) {
      await this.productRepository.deleteBarcode(existingInternal.id);
    }

    const barcode: ConsumableBarcodeRow = {
      id: generateId('cbar'),
      productId,
      barcodeValue: `CPROD-${nanoid(8)}`,
      barcodeType: 'internal',
      isPrimary: true,
    };
    await this.productRepository.saveBarcode(barcode);
    return ConsumableDto.barcodeToResponse(barcode);
  }

  // Packaging levels

  async addPackagingLevel(labId: string, productId: string, data: CreateConsumablePackagingLevelRequest, user: User): Promise<ConsumablePackagingLevelResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);

    const existing = await this.productRepository.findPackagingLevelsByProductId(productId);
    if (existing.some(l => l.unitName === data.unitName)) {
      throw new ValidationError(`A packaging level for "${data.unitName}" already exists on this product`);
    }
    if (data.parentUnit !== null && !existing.some(l => l.unitName === data.parentUnit)) {
      throw new ValidationError(`Parent unit "${data.parentUnit}" does not exist in the packaging chain`);
    }

    const level = {
      id: generateId('cpkg'),
      productId,
      unitName: data.unitName,
      quantity: data.quantity,
      parentUnit: data.parentUnit ?? undefined,
    };
    await this.productRepository.savePackagingLevel(level);
    return ConsumableDto.packagingLevelToResponse(level);
  }

  async updatePackagingLevel(labId: string, productId: string, levelId: string, quantity: number, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);
    await this.productRepository.updatePackagingLevel(levelId, quantity);
  }

  async removePackagingLevel(labId: string, productId: string, levelId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(productId, labId);

    const levels = await this.productRepository.findPackagingLevelsByProductId(productId);
    const level = levels.find(l => l.id === levelId);
    if (!level) throw new NotFoundError('Packaging level not found');

    const hasChildren = levels.some(l => l.parentUnit === level.unitName);
    if (hasChildren) {
      throw new ValidationError(`Cannot delete "${level.unitName}" — other levels reference it as a parent. Delete from the top of the chain down.`);
    }

    await this.productRepository.deletePackagingLevel(levelId);
  }

  // Stock operations

  async recordTransaction(
    labId: string, data: RecordConsumableTransactionRequest | (Omit<RecordConsumableTransactionRequest, 'type'> & { type: 'count_adjustment' }), user: User,
    options?: { bulkOperation?: boolean }
  ): Promise<ConsumableTransactionResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getProductOrThrow(data.productId, labId);

    let effectiveQuantity = data.quantity;
    if (data.type === 'received' && data.receivingUnit) {
      const product = await this.productRepository.findById(data.productId, labId);
      if (product?.stockUnit) {
        const levels = await this.productRepository.findPackagingLevelsByProductId(data.productId);
        const multiplier = this.computeStockUnitMultiplier(levels, data.receivingUnit, product.stockUnit);
        effectiveQuantity = data.quantity * multiplier;
      }
    }

    const quantityChange = data.type === 'consumed' || data.type === 'disposed'
      ? -Math.abs(effectiveQuantity)
      : data.type === 'received'
        ? Math.abs(effectiveQuantity)
        : effectiveQuantity;

    const txn = await this.productRepository.recordTransaction({
      productId: data.productId,
      locationId: data.locationId,
      labId,
      type: data.type,
      quantityChange,
      performedBy: user.id,
      lotNumber: data.lotNumber,
      expirationDate: data.expirationDate,
      poNumber: data.poNumber,
      cost: data.cost,
      notes: data.notes,
    });

    if (data.type === 'received' && data.lotNumber) {
      const product = await this.productRepository.findById(data.productId, labId);
      if (product) {
        product.updateCurrentLotNumber(data.lotNumber);
        await this.productRepository.save(product);
      }
    }

    const event = this.createStockEvent(data.type, data.productId, quantityChange, data.locationId, user.id, labId);
    if (options?.bulkOperation) event.partOfBulkOperation = true;
    await this.eventBus.publish(event);

    return ConsumableDto.transactionToResponse(txn);
  }

  async recordStockCount(
    labId: string, data: RecordConsumableStockCountRequest, user: User
  ): Promise<ConsumableTransactionResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const stockEntries = await this.productRepository.findStockByProductId(data.productId);
    const currentStock = stockEntries.find(s => s.locationId === data.locationId)?.quantity ?? 0;
    const delta = data.actualCount - currentStock;

    return this.recordTransaction(labId, {
      productId: data.productId,
      locationId: data.locationId,
      type: 'count_adjustment',
      quantity: delta,
      lotNumber: data.lotNumber,
      expirationDate: data.expirationDate,
      notes: data.notes,
    }, user);
  }

  async getTransactionHistory(productId: string, limit?: number): Promise<ConsumableTransactionResponse[]> {
    const txns = await this.productRepository.findTransactionsByProductId(productId, limit);
    return txns.map(ConsumableDto.transactionToResponse);
  }

  // Bulk operations

  async bulkReceive(labId: string, data: ConsumableBulkReceiveRequest, user: User): Promise<BulkResult> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await this.executeBulk(
      data.items,
      async (item) => {
        await this.recordTransaction(labId, {
          productId: item.productId,
          locationId: item.locationId,
          type: 'received',
          quantity: item.quantity,
          lotNumber: item.lotNumber,
          expirationDate: item.expirationDate,
          poNumber: item.poNumber,
          cost: item.cost,
          receivingUnit: item.receivingUnit,
        }, user, { bulkOperation: true });
        return item.productId;
      },
      (item, _index, error) => ({ id: item.productId, error })
    );

    if (result.succeeded.length > 0) {
      const perItemData = data.items
        .filter(item => result.succeeded.includes(item.productId))
        .map(item => ({ productId: item.productId, quantity: item.quantity, locationId: item.locationId }));
      await this.eventBus.publish(new ConsumableBulkReceivedEvent(perItemData, user.id, labId));
    }

    return result;
  }

  async bulkConsume(labId: string, data: ConsumableBulkConsumeRequest, user: User): Promise<BulkResult> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await this.executeBulk(
      data.items,
      async (item) => {
        await this.recordTransaction(labId, {
          productId: item.productId,
          locationId: item.locationId,
          type: 'consumed',
          quantity: item.quantity,
        }, user, { bulkOperation: true });
        return item.productId;
      },
      (item, _index, error) => ({ id: item.productId, error })
    );

    if (result.succeeded.length > 0) {
      const perItemData = data.items
        .filter(item => result.succeeded.includes(item.productId))
        .map(item => ({ productId: item.productId, quantity: item.quantity, locationId: item.locationId }));
      await this.eventBus.publish(new ConsumableBulkConsumedEvent(perItemData, user.id, labId));
    }

    return result;
  }

  async bulkReassignCategory(labId: string, productIds: string[], categoryId: string, user: User): Promise<BulkResult> {
    await this.accessControlService.requireAdminAccess(user);

    const category = await this.categoryRepository.findById(categoryId, labId);
    if (!category) throw new NotFoundError('Target category not found');

    const result = await this.executeBulk(
      productIds,
      async (productId) => {
        await this.updateProduct(labId, productId, { categoryId }, user, { bulkOperation: true });
        return productId;
      },
      (productId, _index, error) => ({ id: productId, error })
    );

    if (result.succeeded.length > 0) {
      await this.eventBus.publish(new ConsumableBulkCategoryReassignedEvent(result.succeeded, categoryId, user.id, labId));
    }

    return result;
  }

  async bulkArchive(labId: string, productIds: string[], user: User): Promise<BulkResult> {
    await this.accessControlService.requireAdminAccess(user);

    const result = await this.executeBulk(
      productIds,
      async (productId) => {
        await this.archiveProduct(labId, productId, user, { bulkOperation: true });
        return productId;
      },
      (productId, _index, error) => ({ id: productId, error })
    );

    if (result.succeeded.length > 0) {
      await this.eventBus.publish(new ConsumableBulkArchivedEvent(result.succeeded, user.id, labId));
    }

    return result;
  }

  // Reorder

  async getReorderList(labId: string): Promise<ConsumableProductWithStockResponse[]> {
    const productsWithStock = await this.productRepository.findProductsBelowThreshold(labId);
    return productsWithStock.map(({ product, totalStock, locationNames }) => ConsumableDto.productWithStockToResponse(product, totalStock, locationNames));
  }

  // Helpers

  private async executeBulk<TItem, TSuccess, TFailure>(
    items: TItem[],
    operation: (item: TItem, index: number) => Promise<TSuccess>,
    onFailure: (item: TItem, index: number, error: string) => TFailure
  ): Promise<{ succeeded: TSuccess[]; failed: TFailure[] }> {
    const succeeded: TSuccess[] = [];
    const failed: TFailure[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        succeeded.push(await operation(items[i], i));
      } catch (error) {
        failed.push(onFailure(items[i], i, error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    return { succeeded, failed };
  }

  private async getProductOrThrow(id: string, labId: string): Promise<ConsumableProduct> {
    const product = await this.productRepository.findById(id, labId);
    if (!product) throw new NotFoundError(`Consumable product not found: ${id}`, { productId: id });
    return product;
  }

  private async getCategoryOrThrow(id: string, labId: string): Promise<ConsumableCategory> {
    const category = await this.categoryRepository.findById(id, labId);
    if (!category) throw new NotFoundError(`Consumable category not found: ${id}`, { categoryId: id });
    return category;
  }

  private async getLocationOrThrow(id: string, labId: string): Promise<ConsumableLocation> {
    const location = await this.locationRepository.findById(id, labId);
    if (!location) throw new NotFoundError(`Consumable location not found: ${id}`, { locationId: id });
    return location;
  }

  /** Auto-generates an internal barcode on product creation. Retries on collision. */
  private async generateInternalBarcode(productId: string): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const barcode: ConsumableBarcodeRow = {
          id: generateId('cbar'),
          productId,
          barcodeValue: `CPROD-${nanoid(8)}`,
          barcodeType: 'internal',
          isPrimary: true,
        };
        await this.productRepository.saveBarcode(barcode);
        return;
      } catch (error) {
        if (attempt === 2) {
          logger.warn('Failed to auto-generate internal barcode after 3 attempts', { productId, error });
        }
      }
    }
  }

  private createStockEvent(type: string, productId: string, quantity: number, locationId: string, userId: string, labId: string) {
    switch (type) {
      case 'received': return new ConsumableStockReceivedEvent(productId, quantity, locationId, userId, labId);
      case 'consumed': return new ConsumableStockConsumedEvent(productId, quantity, locationId, userId, labId);
      case 'count_adjustment': return new ConsumableStockCountAdjustedEvent(productId, quantity, locationId, userId, labId);
      case 'disposed': return new ConsumableStockDisposedEvent(productId, quantity, locationId, userId, labId);
      default: return new ConsumableStockReceivedEvent(productId, quantity, locationId, userId, labId);
    }
  }

  /** Walks the packaging chain from fromUnit down to toUnit, multiplying quantities at each step. */
  private computeStockUnitMultiplier(
    levels: Array<{ unitName: string; quantity: number; parentUnit: string | undefined }>,
    fromUnit: string,
    toUnit: string
  ): number {
    if (fromUnit === toUnit) return 1;

    let multiplier = 1;
    let currentUnit = fromUnit;
    const maxDepth = levels.length + 1;

    for (let i = 0; i < maxDepth; i++) {
      const level = levels.find(l => l.unitName === currentUnit);
      if (!level) {
        throw new ValidationError(`Unit "${currentUnit}" not found in the packaging chain`);
      }
      multiplier *= level.quantity;
      const nextUnit = level.parentUnit;
      if (!nextUnit) {
        throw new ValidationError(`No path from "${fromUnit}" to "${toUnit}" in the packaging chain`);
      }
      if (nextUnit === toUnit) return multiplier;
      currentUnit = nextUnit;
    }

    throw new ValidationError(`Circular or broken packaging chain detected`);
  }

  private trackProductChanges(product: ConsumableProduct, data: UpdateConsumableProductRequest): FieldChange[] {
    const changes: FieldChange[] = [];
    const fields: Array<{ key: keyof UpdateConsumableProductRequest; getter: () => unknown }> = [
      { key: 'categoryId', getter: () => product.categoryId },
      { key: 'name', getter: () => product.name },
      { key: 'manufacturer', getter: () => product.manufacturer },
      { key: 'catalogNumber', getter: () => product.catalogNumber },
      { key: 'vendorName', getter: () => product.vendorName },
      { key: 'vendorCatalogNumber', getter: () => product.vendorCatalogNumber },
      { key: 'stockUnit', getter: () => product.stockUnit },
      { key: 'baseItemName', getter: () => product.baseItemName },
      { key: 'reorderThreshold', getter: () => product.reorderThreshold },
      { key: 'reorderQuantity', getter: () => product.reorderQuantity },
      { key: 'reorderUnit', getter: () => product.reorderUnit },
      { key: 'unitPrice', getter: () => product.unitPrice },
      { key: 'description', getter: () => product.description },
      { key: 'notes', getter: () => product.notes },
    ];

    for (const { key, getter } of fields) {
      const newValue = data[key];
      if (newValue !== undefined) {
        const oldValue = getter();
        const normalizedNew = newValue ?? undefined;
        if (oldValue !== normalizedNew) {
          changes.push({ field: key, oldValue, newValue: normalizedNew });
        }
      }
    }

    if (data.properties !== undefined) {
      const oldProps = JSON.stringify(product.properties);
      const newProps = JSON.stringify(data.properties ?? []);
      if (oldProps !== newProps) {
        changes.push({ field: 'properties', oldValue: product.properties, newValue: data.properties ?? [] });
      }
    }

    return changes;
  }
}
