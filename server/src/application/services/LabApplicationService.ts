/**
 * Lab Management Service
 *
 * Read-side aggregation for the system-admin lab console — listing, per-lab
 * detail enrichment, cross-lab overview, and demo limits. Lab writes are handled
 * by the Lab command handlers.
 */

import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';

import { NotFoundError } from '@domain/errors/NotFoundError';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import type { DemoLimitsData, SystemOverview } from '@odysseus/shared-schemas';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface LabApplicationServiceDeps {
  labRepository: LabRepository;
  userRepository: UserRepository;
  tubeRepository: TubeRepository;
  storageRepository: StorageRepository;
  researcherRepository: ResearcherRepository;
  personRepository: PersonRepository;
}

export class LabApplicationService {
  constructor(private deps: LabApplicationServiceDeps) {}

  async listLabs() {
    const labs = await this.deps.labRepository.findAll();

    const demoLab = labs.find(lab => lab.isDemo);
    let demoIsSeeded = false;
    if (demoLab) {
      const config = await this.deps.storageRepository.getForLab(demoLab.id);
      demoIsSeeded = config?.hasAnySeededResources() ?? false;
    }

    return labs.map(lab => ({
      ...lab.toData(),
      ...(lab.isDemo && { isSeeded: demoIsSeeded }),
    }));
  }

  async getLabDetails(labId: string) {
    const lab = await this.deps.labRepository.findById(labId);
    if (!lab) {
      throw new NotFoundError('Lab not found');
    }

    const [users, researchers, tubeCount, config] = await Promise.all([
      this.deps.userRepository.findByLabId(labId),
      this.deps.researcherRepository.findByLabId(labId),
      this.deps.tubeRepository.countByLabId(labId),
      this.deps.storageRepository.getForLab(labId),
    ]);

    const userPersonIds = users.map(u => u.personId).filter((id): id is string => !!id);
    const researcherPersonIds = researchers.map(r => r.personId);
    const allPersonIds = [...new Set([...userPersonIds, ...researcherPersonIds])];
    const persons =
      allPersonIds.length > 0 ? await this.deps.personRepository.findByIds(allPersonIds) : [];
    const personMap = new Map(persons.map(p => [p.id, p]));

    const researcherMap = new Map(researchers.map(r => [r.id, r]));

    const tubeCountMap = await this.deps.researcherRepository.getTubeCountsByResearcherIds(
      researchers.map(r => r.id)
    );

    const userByResearcherId = new Map(
      users.filter(u => u.researcherId).map(u => [u.researcherId!, u])
    );

    const storageCounts = this.countStorage(config);

    return {
      lab: lab.toData(),
      users: users.map(u => {
        const person = u.personId ? personMap.get(u.personId) : undefined;
        const researcher = u.researcherId ? researcherMap.get(u.researcherId) : undefined;
        const researcherPerson = researcher?.personId
          ? personMap.get(researcher.personId)
          : undefined;

        return {
          id: u.id,
          firstName: person?.firstName ?? null,
          lastName: person?.lastName ?? null,
          username: u.username,
          email: person?.email ?? null,
          position: person?.position ?? null,
          department: person?.department ?? null,
          role: u.roleString,
          status: u.status,
          isDemo: u.isDemo,
          lastActivity: u.lastActivity.toISOString(),
          researcher: u.researcherId
            ? {
                name: researcherPerson
                  ? `${researcherPerson.firstName} ${researcherPerson.lastName}`
                  : 'Unknown',
                tubeCount: tubeCountMap.get(u.researcherId) ?? 0,
                active: researcher?.active ?? false,
              }
            : null,
        };
      }),
      researchers: researchers.map(r => {
        const person = personMap.get(r.personId);
        const linkedUser = userByResearcherId.get(r.id);
        return {
          id: r.id,
          firstName: person?.firstName ?? 'Unknown',
          lastName: person?.lastName ?? '',
          email: person?.email,
          active: r.active,
          tubeCount: tubeCountMap.get(r.id) ?? 0,
          linkedUser: linkedUser
            ? { id: linkedUser.id, username: linkedUser.username, status: linkedUser.status }
            : null,
        };
      }),
      researcherCount: researchers.length,
      tubeCount,
      storageSummary: storageCounts,
      isSeeded: config?.hasAnySeededResources() ?? false,
    };
  }

  async getOverview(): Promise<SystemOverview> {
    const [labs, allUsers] = await Promise.all([
      this.deps.labRepository.findAll(),
      this.deps.userRepository.findAllWithLastActivity(),
    ]);

    const usersByLab = new Map<string, { total: number; admins: number }>();
    for (const user of allUsers) {
      if (user.labId) {
        const entry = usersByLab.get(user.labId) ?? { total: 0, admins: 0 };
        entry.total++;
        if (user.roleString === 'lab_admin') entry.admins++;
        usersByLab.set(user.labId, entry);
      }
    }

    const labIds = labs.map(lab => lab.id);
    const [tubeCountMap, researcherCountMap, configMap] = await Promise.all([
      this.deps.tubeRepository.countByLabIds(labIds),
      this.deps.researcherRepository.countByLabIds(labIds),
      this.deps.storageRepository.getForLabs(labIds),
    ]);

    const labStats = labs.map(lab => {
      const userEntry = usersByLab.get(lab.id) ?? { total: 0, admins: 0 };
      const { tankCount, rackCount, boxCount } = this.countStorage(configMap.get(lab.id) ?? null);
      return {
        labId: lab.id,
        labName: lab.name,
        adminCount: userEntry.admins,
        userCount: userEntry.total,
        researcherCount: researcherCountMap.get(lab.id) ?? 0,
        tubeCount: tubeCountMap.get(lab.id) ?? 0,
        tankCount,
        rackCount,
        boxCount,
      };
    });

    let totalTubes = 0;
    for (const count of tubeCountMap.values()) totalTubes += count;
    const activeLabs = labs.filter(l => l.isActive).length;
    const inactiveLabs = labs.length - activeLabs;
    const oneDayAgo = Date.now() - MS_PER_DAY;
    const activeUsersLast24h = allUsers.filter(
      u => u.lastActivity && new Date(u.lastActivity).getTime() > oneDayAgo
    ).length;

    return {
      totalLabs: labs.length,
      activeLabs,
      inactiveLabs,
      totalUsers: allUsers.length,
      activeUsersLast24h,
      totalTubes,
      labStats,
    };
  }

  async getDemoLimits(labId: string): Promise<DemoLimitsData> {
    const lab = await this.deps.labRepository.findById(labId);
    if (!lab) {
      throw new NotFoundError('Lab not found');
    }

    return { limits: lab.demoLimits ?? DEMO_LIMITS_DEFAULTS };
  }

  private countStorage(
    config: { toData(): { tanks: { racks: { boxes: unknown[] }[] }[] } } | null | undefined
  ): { tankCount: number; rackCount: number; boxCount: number } {
    if (!config) return { tankCount: 0, rackCount: 0, boxCount: 0 };
    const data = config.toData();
    let rackCount = 0,
      boxCount = 0;
    for (const tank of data.tanks) {
      rackCount += tank.racks.length;
      for (const rack of tank.racks) {
        boxCount += rack.boxes.length;
      }
    }
    return { tankCount: data.tanks.length, rackCount, boxCount };
  }
}
