/**
 * Attribute Route Module
 *
 * Routes for lab attribute definitions and their options.
 */

import type { AuthMiddleware } from '@application/contracts/AuthMiddleware';
import type { AttributeController } from '@presentation/controllers/AttributeController';
import { validateBody, validateParams } from '@presentation/middleware/requestValidation';
import type { RouteModule } from '@presentation/routes/RouteModule';
import {
  AttributeDefinitionIdParams,
  AttributeOptionIdParams,
  CreateAttributeDefinitionHttpSchema,
  UpdateAttributeDefinitionHttpSchema,
  CreateAttributeOptionHttpSchema,
  UpdateAttributeOptionHttpSchema,
} from '@presentation/validation/httpValidationSchemas';

import type { Router, RequestHandler } from 'express';

export class AttributeRouteModule implements RouteModule {
  constructor(
    private attributeController: AttributeController,
    private authMiddleware: AuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api/attributes';
  }

  getMiddleware(): RequestHandler[] {
    return [this.authMiddleware.authenticate.bind(this.authMiddleware)];
  }

  configure(router: Router): void {
    router.get('/', this.attributeController.listAttributes.bind(this.attributeController));

    router.post(
      '/',
      validateBody(CreateAttributeDefinitionHttpSchema),
      this.attributeController.createDefinition.bind(this.attributeController)
    );

    router.put(
      '/:definitionId',
      validateParams(AttributeDefinitionIdParams),
      validateBody(UpdateAttributeDefinitionHttpSchema),
      this.attributeController.updateDefinition.bind(this.attributeController)
    );

    router.delete(
      '/:definitionId',
      validateParams(AttributeDefinitionIdParams),
      this.attributeController.deleteDefinition.bind(this.attributeController)
    );

    router.post(
      '/:definitionId/options',
      validateParams(AttributeDefinitionIdParams),
      validateBody(CreateAttributeOptionHttpSchema),
      this.attributeController.createOption.bind(this.attributeController)
    );

    router.put(
      '/options/:optionId',
      validateParams(AttributeOptionIdParams),
      validateBody(UpdateAttributeOptionHttpSchema),
      this.attributeController.updateOption.bind(this.attributeController)
    );

    router.delete(
      '/options/:optionId',
      validateParams(AttributeOptionIdParams),
      this.attributeController.deleteOption.bind(this.attributeController)
    );
  }
}
