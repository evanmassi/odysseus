/**
 * Audit DI Module
 *
 * Lazy-singleton wiring for audit logging, retention, archival, and data export.
 */

import { AuditEventHandler } from '@application/event-handlers/AuditEventHandler';
import { AuditRetentionService } from '@application/services/AuditRetentionService';
import { AuditService } from '@application/services/AuditService';
import { ExportService } from '@application/services/ExportService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { AuditArchivalJob } from '@infrastructure/jobs/AuditArchivalJob';
import { AuditArchiveRepository } from '@infrastructure/repositories/AuditArchiveRepository';
import { AuditController } from '@presentation/controllers/AuditController';
import { ExportController } from '@presentation/controllers/ExportController';

export class AuditModule {
  private auditService?: AuditService;
  private auditRetentionService?: AuditRetentionService;
  private auditArchiveRepository?: AuditArchiveRepository;
  private auditArchivalJob?: AuditArchivalJob;
  private auditEventHandler?: AuditEventHandler;
  private auditController?: AuditController;
  private exportService?: ExportService;
  private exportController?: ExportController;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  getAuditService(): AuditService {
    if (!this.auditService) {
      this.auditService = new AuditService(this.repositoryFactory.getAuditRepository());
    }
    return this.auditService;
  }

  getAuditArchiveRepository(): AuditArchiveRepository {
    if (!this.auditArchiveRepository) {
      this.auditArchiveRepository = new AuditArchiveRepository(
        this.repositoryFactory.getPostgresContext()
      );
    }
    return this.auditArchiveRepository;
  }

  getAuditRetentionService(): AuditRetentionService {
    if (!this.auditRetentionService) {
      this.auditRetentionService = new AuditRetentionService(
        this.repositoryFactory.getAuditRepository(),
        this.getAuditArchiveRepository()
      );
    }
    return this.auditRetentionService;
  }

  getAuditArchivalJob(): AuditArchivalJob {
    if (!this.auditArchivalJob) {
      this.auditArchivalJob = new AuditArchivalJob(this.getAuditRetentionService());
    }
    return this.auditArchivalJob;
  }

  getAuditEventHandler(): AuditEventHandler {
    if (!this.auditEventHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.auditEventHandler = new AuditEventHandler(
        this.getAuditService(),
        this.shared.eventBus,
        repositories.users,
        repositories.storage,
        repositories.labs,
        repositories.donors
      );
    }
    return this.auditEventHandler;
  }

  getAuditController(): AuditController {
    if (!this.auditController) {
      this.auditController = new AuditController({
        auditService: this.getAuditService(),
        retentionService: this.getAuditRetentionService(),
      });
    }
    return this.auditController;
  }

  getExportService(): ExportService {
    if (!this.exportService) {
      const repositories = this.repositoryFactory.getRepositories();
      this.exportService = new ExportService(
        repositories.tubes,
        repositories.users,
        repositories.researchers,
        repositories.persons,
        repositories.storage,
        this.shared.configurationService.get('app').version,
        repositories.equipmentItems,
        repositories.equipmentCategories,
        repositories.supplyItems,
        repositories.locations
      );
    }
    return this.exportService;
  }

  getExportController(): ExportController {
    if (!this.exportController) {
      this.exportController = new ExportController({
        exportService: this.getExportService(),
      });
    }
    return this.exportController;
  }
}
