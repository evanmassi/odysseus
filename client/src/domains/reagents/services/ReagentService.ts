/**
 * Reagent Data Service
 *
 * HTTP operations for the reagent catalog: categories and the item list.
 */

import {
  reagentCategoryResponseSchema,
  reagentCategoryListResponseSchema,
  reagentItemListResponseSchema,
  type ReagentCategory,
  type ReagentItemWithStock,
  type CreateReagentCategoryRequest,
  type UpdateReagentCategoryRequest,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class ReagentService {
  private static readonly BASE_PATH = '/reagents';

  // Categories

  static async listCategories(): Promise<ReagentCategory[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/categories`,
      reagentCategoryListResponseSchema
    );
    return response.categories;
  }

  static async createCategory(data: CreateReagentCategoryRequest): Promise<ReagentCategory> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/categories`,
      data,
      reagentCategoryResponseSchema
    );
    return response.category;
  }

  static async updateCategory(
    id: string,
    data: UpdateReagentCategoryRequest
  ): Promise<ReagentCategory> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/categories/${id}`,
      data,
      reagentCategoryResponseSchema
    );
    return response.category;
  }

  static async deleteCategory(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/categories/${id}`);
  }

  // Items

  static async listItems(): Promise<ReagentItemWithStock[]> {
    const response = await httpClient.getData(this.BASE_PATH, reagentItemListResponseSchema);
    return response.items;
  }
}
