# Configuration Cache Invalidation Investigation Report

**Date:** 2025-01-07
**System:** Odysseus Research Lab Inventory Management
**Focus:** Configuration version-based cache invalidation implementation

---

## Executive Summary

This report provides a complete technical analysis of implementing cache invalidation using the configuration `version` field. The investigation covers the entire data flow from server to client, identifies all integration points, and provides actionable implementation guidance.

**Key Findings:**
- Configuration entity has a working `version` field that increments on every change
- Current implementation lacks version-based cache invalidation
- Zustand persist middleware caches stale data in localStorage indefinitely
- No Socket.IO real-time updates for configuration changes
- Clear implementation path exists following established patterns

---

## 1. Current State Analysis

### 1.1 Server-Side Architecture

#### Configuration Entity
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\server\src\domain\entities\Configuration.ts`

The `Configuration` entity is an aggregate root with built-in version management:

```typescript
// Lines 18-23
export class Configuration {
  private constructor(
    private _equipment: EquipmentConfiguration,
    private _systemSettings: SystemSettings,
    private _updatedAt: Date,
    private _version: number  // Version field exists
  ) {
    this.validate();
  }
}
```

**Version Increment Logic:**
```typescript
// Lines 569-572
private touch(): void {
  this._updatedAt = new Date();
  this._version++;  // Auto-increments on every mutation
}
```

**Version is incremented by:**
- `updateSystemSettings()` (line 312)
- `updateTanks()` (line 326)
- `updateRacks()` (line 356)
- `updateBoxes()` (line 406)
- `updateBoxPositionDisplay()` (line 495)
- `updateLabDefaultPositionDisplay()` (line 519)
- `addTank()`, `addRack()`, `addBox()`, `removeTank()` (lines 178, 219, 278, 294)

#### Repository Layer
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\server\src\infrastructure\repositories\SQLiteConfigurationRepository.ts`

Database persistence with versioning:

```typescript
// Lines 138-177
async saveWithVersioning(
  configuration: Configuration,
  changeDescription: string = 'Configuration updated',
  changedBy: string = 'system'
): Promise<void> {
  // Transaction-based save
  await this.sqlite.execute('BEGIN TRANSACTION');

  // Insert new version to history table
  await this.sqlite.execute(`
    INSERT INTO configuration_versions (updated_at, change_description, changed_by, config_json)
    VALUES (?, ?, ?, ?)
  `, [now, changeDescription, changedBy, configJson]);

  const newVersion = result.lastInsertRowid;

  // Update current configuration with new version
  await this.sqlite.execute(`
    UPDATE configuration_current
    SET version = ?, updated_at = ?, config_json = ?
    WHERE id = 1
  `, [newVersion, now, configJson]);

  await this.sqlite.execute('COMMIT');
}
```

**Database Schema:**
```sql
-- Configuration history (append-only log)
CREATE TABLE configuration_versions (
  version INTEGER PRIMARY KEY AUTOINCREMENT,
  updated_at TEXT NOT NULL,
  change_description TEXT,
  changed_by TEXT,
  config_json TEXT NOT NULL
);

-- Current configuration (single row)
CREATE TABLE configuration_current (
  id INTEGER PRIMARY KEY DEFAULT 1,
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  config_json TEXT NOT NULL,
  FOREIGN KEY (version) REFERENCES configuration_versions(version)
);
```

#### API Response Format
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\server\src\domain\entities\Configuration.ts`

```typescript
// Lines 625-653
toApiData(): {
  equipment: {
    tanks: ReturnType<Tank['toData']>[];
  };
  systemSettings: {
    labName: string;
    defaultResearcher: string;
    autoSave: boolean;
    auditTrailEnabled: boolean;
    syncEnabled: boolean;
    defaultPositionDisplay?: PositionDisplayConfig;
  };
  metadata: {
    updatedAt: string;
    version: number;  // ✅ Version IS included in API response
  };
}
```

**Controller Response:**
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\server\src\presentation\controllers\ConfigurationController.ts`

```typescript
// Lines 65-79
async getCurrentConfiguration(req: Request, res: Response): Promise<void> {
  const configuration = await this.getCurrentConfigurationHandler.handle({});
  const configurationResponse = ConfigurationDto.toResponse(configuration);

  res.json({
    success: true,
    data: configurationResponse  // Includes metadata.version
  });
}
```

### 1.2 Client-Side Architecture

#### Zustand Store with Persist
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\stores\storageStore.ts`

```typescript
// Lines 187-771
export const useStorageStore = create<ConfigurationState>()(
  persist(
    (set, get) => {
      // Store implementation
      return {
        systemConfig: defaultSystemConfig,
        currentLab: deriveCurrentLab(defaultSystemConfig),
        // ... actions
      };
    },
    {
      name: 'odysseus-configuration-store',  // localStorage key
      version: 2,  // ⚠️ This is store schema version, NOT configuration version
      migrate: (persistedState: any, version: number) => {
        // Grid config migration logic
      }
    }
  )
);
```

**Problem:**
- `version: 2` is the Zustand persist schema version for migrations
- It does NOT track server configuration version
- No cache invalidation based on server version changes

#### React Query Integration
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\hooks\useStorageQuery.ts`

```typescript
// Lines 16-28
export const useLoadStorageQuery = (config?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  return useQuery({
    queryKey: queryKeys.storage.storage(),
    queryFn: () => StorageService.loadConfiguration(),
    enabled: config?.enabled ?? true,
    staleTime: config?.staleTime ?? 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,  // ⚠️ Won't refetch on focus
  });
};
```

**Observations:**
- React Query manages server state with 10-minute stale time
- Does NOT check version before considering data stale
- `refetchOnWindowFocus: false` means stale cache persists across sessions

#### Configuration Sync Hook
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\hooks\useConfigurationSync.ts`

```typescript
// Lines 13-74
export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const hasSynced = useRef(false);

  // Sync server data to client store (only once)
  useEffect(() => {
    if (isSuccess && data && !hasSynced.current) {
      hasSynced.current = true;

      console.log('📥 [ConfigSync] Syncing configuration from server');
      useStorageStore.setState({
        systemConfig: data.configuration.systemConfig  // ⚠️ No version check
      });
    }
  }, [isSuccess, data]);
}
```

**Problem:**
- Syncs once per session without version validation
- If localStorage has version 5 and server has version 10, no invalidation occurs
- `hasSynced.current` prevents re-sync even if data is stale

#### Storage Service
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\domains\storage\services\StorageService.ts`

```typescript
// Lines 24-35
static async loadConfiguration(): Promise<ConfigurationResponse> {
  const response = await httpClient.getData('/configuration', ConfigurationResponseSchema);
  return response;  // Returns { configuration: { systemConfig, currentLab } }
}
```

**Schema Definition:**
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\packages\shared-schemas\src\storage\configurationSchemas.ts`

```typescript
// Lines 111-116
export const SystemConfigurationSchema = z.object({
  currentLabId: z.string(),
  availableLabs: z.array(LabConfigurationSchema),
  globalSettings: GlobalSettingsSchema,
  version: z.string(),  // ✅ Version field exists in schema
}).strict();

// Lines 119-126
export const ConfigurationResponseSchema = z.object({
  configuration: z.object({
    systemConfig: SystemConfigurationSchema,  // Contains version
    currentLab: LabConfigurationSchema,
  }),
}).strict();
```

### 1.3 Socket.IO Integration

#### Client Socket Bridge
**Location:** `C:\Users\evan\Desktop\Odysseus\odysseus-app\client\src\infrastructure\socket\queryBridge.ts`

```typescript
// Lines 183-336
private setupTubeEventHandlers(): void {
  // Handles: tube_created, tube_updated, tube_deleted, tubes_bulk_updated
}

private setupResearcherEventHandlers(): void {
  // Handles: researcher_created, researcher_updated, researcher_deleted
}
```

**Problem:**
- ❌ NO handler for `configuration_updated` event
- Configuration changes do NOT trigger real-time cache invalidation
- Users won't see configuration updates until manual refresh

#### Server Socket Emission
**Search Result:** No `configuration_updated` emissions found in server code

**Expected location:** Should be in command handlers after configuration updates:
- `UpdateSystemConfigurationCommandHandler`
- `UpdateEquipmentConfigurationCommandHandler`
- `UpdateConfigurationCommandHandler`

---

## 2. Version Field Analysis

### 2.1 Server Version Management

**Version Lifecycle:**

1. **Creation:**
```typescript
// Configuration.createDefault() - Line 59
return new Configuration(equipment, systemSettings, new Date(), 1);  // Version starts at 1
```

2. **Updates:**
```typescript
// Any mutation method calls touch()
private touch(): void {
  this._updatedAt = new Date();
  this._version++;  // Increments atomically
}
```

3. **Persistence:**
```typescript
// SQLiteConfigurationRepository.saveWithVersioning()
// Version stored in both:
// - configuration_versions.version (autoincrement primary key)
// - configuration_current.version (foreign key reference)
```

4. **API Response:**
```typescript
// Configuration.toApiData()
metadata: {
  updatedAt: string;  // ISO timestamp
  version: number;    // Integer version number
}
```

### 2.2 Client Version Storage

**Current State:**
```typescript
// storageStore.ts
const defaultSystemConfig = createDefaultSystemConfig();

// createDefaultSystemConfig() in storageStore.ts (Line 143-153)
const createDefaultSystemConfig = (): SystemConfiguration => ({
  currentLabId: DEFAULT_LAB_CONFIG.id,
  availableLabs: [DEFAULT_LAB_CONFIG],
  globalSettings: {
    theme: SYSTEM_DEFAULTS.SETTINGS.THEME,
    language: SYSTEM_DEFAULTS.SETTINGS.LANGUAGE,
    timezone: SYSTEM_DEFAULTS.SETTINGS.TIMEZONE,
    autoBackup: SYSTEM_DEFAULTS.SETTINGS.AUTO_BACKUP,
  },
  version: SYSTEM_DEFAULTS.CONFIGURATION.VERSION,  // ✅ "2.0.0" string
});
```

**Schema Type:**
```typescript
// SystemConfiguration.version is z.string()
// Server Configuration.version is number
```

**⚠️ TYPE MISMATCH DETECTED:**
- Client expects `version: string` (e.g., "2.0.0")
- Server provides `version: number` (e.g., 1, 2, 3)
- This is a **critical schema inconsistency**

### 2.3 Version in API Responses

**Actual API Response Structure:**
```json
{
  "success": true,
  "data": {
    "equipment": {
      "tanks": [...]
    },
    "systemSettings": {
      "labName": "Standard Laboratory",
      ...
    },
    "metadata": {
      "updatedAt": "2025-01-07T10:30:00.000Z",
      "version": 5  // Integer version number
    }
  }
}
```

**⚠️ Problem:**
- Server returns `metadata.version: number`
- Client expects `configuration.systemConfig.version: string`
- Version is NOT in the expected location in the response

---

## 3. Required Changes

### 3.1 Fix Schema Inconsistency

**Problem:**
- Server `Configuration.version` is `number`
- Client `SystemConfiguration.version` is `string`
- Server API returns version in `metadata.version`
- Client expects version in `systemConfig.version`

**Solution Options:**

#### Option A: Align to Server (Recommended)
Change client schema to match server:

```typescript
// shared-schemas/src/storage/configurationSchemas.ts
export const SystemConfigurationSchema = z.object({
  currentLabId: z.string(),
  availableLabs: z.array(LabConfigurationSchema),
  globalSettings: GlobalSettingsSchema,
  version: z.number(),  // Changed from z.string()
}).strict();
```

Update client default:
```typescript
// storageStore.ts
version: 1,  // Changed from SYSTEM_DEFAULTS.CONFIGURATION.VERSION
```

**Impact:**
- ✅ Type-safe version comparison
- ✅ Aligns with database schema
- ⚠️ Requires client code updates
- ⚠️ Requires migration for existing localStorage data

#### Option B: Align to Client
Change server to use semantic versioning:

```typescript
// server Configuration entity
private _version: string  // Changed from number
```

**Impact:**
- ❌ Requires database migration (version column type change)
- ❌ Breaks autoincrement versioning
- ❌ More complex to implement
- ❌ NOT RECOMMENDED

**Recommendation:** **Option A** - Align client to server numeric version

### 3.2 Move Version to Correct Location

**Current API Response:**
```json
{
  "data": {
    "equipment": {...},
    "systemSettings": {...},
    "metadata": {
      "version": 5  // Version is here
    }
  }
}
```

**Client expects:**
```json
{
  "configuration": {
    "systemConfig": {
      "version": 5,  // Version should be here
      ...
    },
    "currentLab": {...}
  }
}
```

**Solution:**

Update `ConfigurationDto.toResponse()` to include version in systemConfig:

```typescript
// server/src/application/dto/ConfigurationDto.ts
static toResponse(configuration: Configuration): ConfigurationResponse {
  const data = configuration.toData();

  return {
    configuration: {
      systemConfig: {
        currentLabId: 'default-lab',  // Derive from lab
        availableLabs: [/* transform tanks to lab format */],
        globalSettings: {
          theme: 'light',
          language: 'en',
          timezone: data.systemSettings.timezone || 'America/New_York',
          autoBackup: data.systemSettings.autoSave,
        },
        version: configuration.version,  // ✅ Add version here
      },
      currentLab: {/* ... */}
    }
  };
}
```

### 3.3 Implement Version-Based Cache Invalidation

#### Step 1: Store Server Version in Zustand

```typescript
// storageStore.ts
interface ConfigurationState {
  systemConfig: SystemConfiguration;
  currentLab: LabConfiguration;
  serverVersion: number | null;  // ✅ Add server version tracking

  // Actions
  setServerVersion: (version: number) => void;
  checkVersionMismatch: () => boolean;
  // ... existing actions
}

export const useStorageStore = create<ConfigurationState>()(
  persist(
    (set, get) => ({
      // ... existing state
      serverVersion: null,

      setServerVersion: (version: number) => {
        set({ serverVersion: version });
      },

      checkVersionMismatch: () => {
        const { systemConfig, serverVersion } = get();
        if (serverVersion === null) return false;
        return systemConfig.version !== serverVersion;
      },

      // ... existing actions
    }),
    {
      name: 'odysseus-configuration-store',
      version: 2,
      // Add serverVersion to persisted state
    }
  )
);
```

#### Step 2: Version Check in Configuration Sync

```typescript
// useConfigurationSync.ts
export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const saveMutation = useSaveStorageMutation();
  const queryClient = useQueryClient();

  const hasSynced = useRef(false);
  const hasInitialized = useRef(false);

  // Version-based cache invalidation
  useEffect(() => {
    if (isSuccess && data && !hasSynced.current) {
      const serverConfig = data.configuration.systemConfig;
      const serverVersion = serverConfig.version;
      const store = useStorageStore.getState();
      const cachedVersion = store.systemConfig.version;

      // Check for version mismatch
      if (cachedVersion !== serverVersion) {
        console.log(
          `🔄 [ConfigSync] Version mismatch detected. ` +
          `Cached: ${cachedVersion}, Server: ${serverVersion}. ` +
          `Invalidating cache...`
        );

        // Clear stale cache
        queryClient.invalidateQueries({
          queryKey: queryKeys.storage.storage()
        });

        // Force sync from server
        useStorageStore.setState({
          systemConfig: serverConfig,
          serverVersion: serverVersion,
        });

        console.log('✅ [ConfigSync] Cache invalidated and synced with server');
      } else {
        console.log(`✅ [ConfigSync] Version match (v${serverVersion}). Cache is fresh.`);

        // Update server version tracking
        useStorageStore.setState({
          serverVersion: serverVersion,
        });
      }

      hasSynced.current = true;
    }
  }, [isSuccess, data, queryClient]);

  // ... rest of hook
}
```

#### Step 3: Version Check on Every Load

```typescript
// useStorageQuery.ts
export const useLoadStorageQuery = (config?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.storage.storage(),
    queryFn: async () => {
      const response = await StorageService.loadConfiguration();

      // Check version on every load
      const serverVersion = response.configuration.systemConfig.version;
      const store = useStorageStore.getState();
      const cachedVersion = store.systemConfig.version;

      if (cachedVersion !== serverVersion) {
        console.log(
          `🔄 [Storage] Version change detected during fetch. ` +
          `Cached: ${cachedVersion} → Server: ${serverVersion}`
        );

        // Update Zustand store with fresh data
        useStorageStore.setState({
          systemConfig: response.configuration.systemConfig,
          serverVersion: serverVersion,
        });
      }

      return response;
    },
    enabled: config?.enabled ?? true,
    staleTime: config?.staleTime ?? 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,  // ✅ Enable refetch on focus
  });
};
```

### 3.4 Add Socket.IO Real-Time Updates

#### Step 1: Server - Emit Configuration Updates

```typescript
// server/src/application/commands/ConfigurationCommands.ts

export class UpdateConfigurationCommandHandler {
  constructor(
    private configurationRepository: ConfigurationRepository,
    private validationService: ValidationService,
    private userRepository: UserRepository,
    private eventBus: EventBus  // ✅ Add EventBus for Socket.IO
  ) {}

  async handle(command: UpdateConfigurationCommand): Promise<Configuration> {
    // ... existing update logic

    const updatedConfig = await this.configurationRepository.saveWithVersioning(
      transformedConfig,
      'Configuration updated from frontend'
    );

    // ✅ Emit real-time update
    this.eventBus.publish({
      type: 'configuration_updated',
      payload: {
        version: updatedConfig.version,
        updatedAt: updatedConfig.updatedAt,
        changedBy: command.userId,
      }
    });

    return updatedConfig;
  }
}
```

#### Step 2: Client - Handle Configuration Updates

```typescript
// client/src/infrastructure/socket/queryBridge.ts

private setupConfigurationEventHandlers(): void {
  if (!this.socket) return;

  this.socket.on('configuration_updated', (data: unknown) => {
    try {
      const configUpdateSchema = z.object({
        version: z.number(),
        updatedAt: z.string(),
        changedBy: z.string(),
      });

      const { version, updatedAt } = configUpdateSchema.parse(data);

      console.log(
        `🔔 [SocketBridge] Configuration updated event received. ` +
        `New version: ${version}`
      );

      // Invalidate configuration cache to trigger refetch
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage()
      });

      // Show notification to user
      notifications.info(
        `System configuration updated to version ${version}. ` +
        `Changes will take effect shortly.`
      );

    } catch (error) {
      console.error('❌ [SocketBridge] Invalid configuration_updated event:', error);
    }
  });
}

// Update initializeSocket to register handler
public initializeSocket(socket: Socket): void {
  if (this.isInitialized) {
    console.warn('⚠️ [SocketBridge] Already initialized');
    return;
  }

  this.socket = socket;
  this.setupConnectionHandlers();
  this.setupTubeEventHandlers();
  this.setupResearcherEventHandlers();
  this.setupConfigurationEventHandlers();  // ✅ Add this
  this.setupReconnectionHandlers();

  this.isInitialized = true;
}
```

#### Step 3: Update Query Keys

```typescript
// client/src/app/queryKeys.ts

export const queryKeys = {
  // ... existing keys

  storage: {
    all: ['storage'] as const,
    storage: () => [...queryKeys.storage.all, 'data'] as const,
    exists: () => [...queryKeys.storage.all, 'exists'] as const,
    positionDisplayPresets: () => [...queryKeys.storage.all, 'positionDisplayPresets'] as const,
    version: () => [...queryKeys.storage.all, 'version'] as const,  // ✅ Add version key
  }
} as const;
```

---

## 4. Integration Points

### 4.1 React Query ↔ Zustand

**Current Flow:**
```
Server API → React Query (useLoadStorageQuery) → useConfigurationSync → Zustand Store → UI
```

**With Version Checking:**
```
Server API → React Query
           ↓
    Version Check (compare server vs cached)
           ↓
    [Mismatch?] → Invalidate Cache → Refetch → Update Zustand
    [Match?] → Use Cached Data → Update Zustand
```

### 4.2 Socket.IO ↔ React Query

**Current Flow:**
```
Server Update → (NO SOCKET EVENT) → Client unaware
```

**With Real-Time Updates:**
```
Server Update → EventBus.publish('configuration_updated')
             ↓
        Socket.IO broadcasts
             ↓
   SocketQueryBridge.on('configuration_updated')
             ↓
   queryClient.invalidateQueries(storage)
             ↓
   React Query refetches → Version check → Update Zustand
```

### 4.3 Zustand Persist ↔ localStorage

**Current Flow:**
```
Zustand State Changes → Persist Middleware → localStorage['odysseus-configuration-store']
                                           ↓
                                    Persists FOREVER (no TTL)
```

**With Version Tracking:**
```
Zustand State Changes → Persist Middleware → localStorage (includes serverVersion)
                                           ↓
On App Load → Read from localStorage
           ↓
    Compare cached.version vs server.version
           ↓
    [Mismatch?] → Discard localStorage → Fetch fresh → Persist new version
    [Match?] → Use localStorage → Update serverVersion tracking
```

### 4.4 Server Repository ↔ Database

**Current Flow:**
```
Configuration.updateX() → touch() increments version
                       ↓
   saveWithVersioning() → BEGIN TRANSACTION
                       ↓
           INSERT INTO configuration_versions (new version)
                       ↓
           UPDATE configuration_current (set version = new)
                       ↓
                     COMMIT
```

**With Socket Emission:**
```
Configuration.updateX() → touch() increments version
                       ↓
   saveWithVersioning() → Transaction (as above)
                       ↓
           EventBus.publish('configuration_updated', { version })
                       ↓
                Socket.IO broadcasts to all connected clients
```

---

## 5. Edge Cases

### 5.1 First Load (No localStorage)

**Scenario:** User opens app for the first time

**Current Behavior:**
1. `useStorageStore` initializes with default config (version: "2.0.0")
2. `useConfigurationSync` fetches from server
3. Syncs server data to Zustand
4. Persists to localStorage

**With Version Checking:**
1. Zustand initializes with default (version: 1, serverVersion: null)
2. `useLoadStorageQuery` fetches from server (version: 5)
3. Version check: 1 !== 5 → Mismatch detected
4. Update Zustand with server data (version: 5, serverVersion: 5)
5. Persist to localStorage

**Edge Case Handling:**
- ✅ No special handling needed
- Initial mismatch is expected and handled gracefully

### 5.2 Server Version Older Than Cached

**Scenario:** Database is reset/restored from backup

**Example:**
- Cached version: 10
- Server version: 5 (after database reset)

**Expected Behavior:**
1. Version check detects 10 !== 5
2. Server version (5) is authoritative
3. Invalidate cache and sync from server
4. Warn user about potential data loss

**Implementation:**
```typescript
if (cachedVersion !== serverVersion) {
  if (cachedVersion > serverVersion) {
    console.warn(
      `⚠️ [ConfigSync] Server version (${serverVersion}) is older than ` +
      `cached version (${cachedVersion}). Database may have been reset. ` +
      `Syncing from server...`
    );

    notifications.warning(
      'System configuration was reset. Your local settings have been updated.'
    );
  }

  // Sync from server regardless
  useStorageStore.setState({
    systemConfig: serverConfig,
    serverVersion: serverVersion,
  });
}
```

### 5.3 Multi-Tab Behavior

**Scenario:** User has app open in multiple tabs

**Tab 1:**
1. Admin updates configuration
2. Socket.IO receives `configuration_updated`
3. React Query invalidates cache
4. Refetches and updates Zustand
5. Zustand persist writes to localStorage

**Tab 2:**
1. localStorage changes (from Tab 1)
2. Zustand persist middleware detects change (via storage event)
3. Rehydrates store with new data
4. ⚠️ **Problem:** Zustand persist doesn't automatically sync across tabs

**Solution - Storage Event Listener:**
```typescript
// storageStore.ts

// Listen for localStorage changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'odysseus-configuration-store' && event.newValue) {
      try {
        const newState = JSON.parse(event.newValue);

        // Sync from other tab
        useStorageStore.setState({
          systemConfig: newState.state.systemConfig,
          serverVersion: newState.state.serverVersion,
        });

        console.log('🔄 [StorageStore] Synced configuration from another tab');
      } catch (error) {
        console.error('❌ [StorageStore] Failed to sync from other tab:', error);
      }
    }
  });
}
```

### 5.4 Race Conditions

**Scenario 1: Parallel Fetches**
```
Time 0: User opens app
Time 1: useConfigurationSync fetches (version: 5)
Time 2: Admin updates config (version: 6)
Time 3: useLoadStorageQuery completes with version 5
Time 4: Socket event arrives with version 6
```

**Solution:**
- React Query handles race conditions via query deduplication
- Socket event invalidates cache, triggering refetch with latest version
- Last write wins (version 6)

**Scenario 2: Save During Fetch**
```
Time 0: User fetches config (version: 5)
Time 1: Fetch in progress...
Time 2: Admin saves config (version: 6)
Time 3: Fetch completes with stale data (version: 5)
Time 4: User works with stale data
```

**Solution:**
- Socket.IO `configuration_updated` event arrives at Time 2
- Invalidates cache before fetch completes
- React Query automatically refetches after invalidation
- User gets fresh data (version: 6)

### 5.5 Offline Mode

**Scenario:** User loses network connection

**Behavior:**
1. App uses cached configuration from localStorage
2. React Query enters offline mode (no refetch attempts)
3. Version checks are skipped (no server connection)
4. When back online:
   - React Query automatically retries
   - Version check runs on reconnect
   - Cache invalidated if version mismatch

**Implementation:**
```typescript
// useStorageQuery.ts

export const useLoadStorageQuery = (config?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  const isOnline = useNetworkStatus();  // Hook to detect online status

  return useQuery({
    queryKey: queryKeys.storage.storage(),
    queryFn: async () => {
      const response = await StorageService.loadConfiguration();
      // Version check logic...
      return response;
    },
    enabled: config?.enabled ?? true,
    staleTime: config?.staleTime ?? 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: isOnline ? 2 : 0,  // Don't retry when offline
    refetchOnWindowFocus: isOnline,  // Only refetch when online
    refetchOnReconnect: true,  // ✅ Refetch when network reconnects
  });
};
```

### 5.6 Version Number Overflow

**Scenario:** Version reaches maximum integer value

**SQLite INTEGER range:** -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807

**Calculation:**
- Assuming 100 configuration changes per day
- Time to overflow: 9,223,372,036,854,775,807 / (100 * 365) ≈ 252 billion years

**Conclusion:** ✅ No practical concern for overflow

---

## 6. Testing Strategy

### 6.1 Unit Tests

#### Server Side

**Test: Version Increments on Update**
```typescript
// Configuration.test.ts
describe('Configuration Version Management', () => {
  it('should increment version on system settings update', () => {
    const config = Configuration.createDefault();
    expect(config.version).toBe(1);

    const updated = config.updateSystemSettings({ labName: 'New Lab' });
    expect(updated.version).toBe(2);
  });

  it('should increment version on tank addition', () => {
    const config = Configuration.createDefault();
    const initialVersion = config.version;

    config.addTank('tank-2', 'Tank 2', 5);
    expect(config.version).toBe(initialVersion + 1);
  });
});
```

**Test: Repository Versioning**
```typescript
// SQLiteConfigurationRepository.test.ts
describe('Configuration Repository Versioning', () => {
  it('should save configuration with incremented version', async () => {
    const repo = new SQLiteConfigurationRepository(sqlite);
    const config = Configuration.createDefault();

    await repo.save(config);
    const currentVersion = await repo.getCurrentVersion();
    expect(currentVersion).toBe(1);

    const updated = config.updateSystemSettings({ labName: 'Updated' });
    await repo.save(updated);

    const newVersion = await repo.getCurrentVersion();
    expect(newVersion).toBe(2);
  });

  it('should retrieve configuration by version', async () => {
    const repo = new SQLiteConfigurationRepository(sqlite);

    // Save version 1
    const config1 = Configuration.createDefault();
    await repo.save(config1);

    // Save version 2
    const config2 = config1.updateSystemSettings({ labName: 'V2' });
    await repo.save(config2);

    // Retrieve version 1
    const retrieved = await repo.getByVersion(1);
    expect(retrieved?.version).toBe(1);
    expect(retrieved?.systemSettings.labName).toBe('Standard Laboratory');
  });
});
```

#### Client Side

**Test: Version Check Triggers Invalidation**
```typescript
// useConfigurationSync.test.tsx
describe('Configuration Sync Version Checking', () => {
  it('should invalidate cache when versions mismatch', async () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useConfigurationSync(), {
      wrapper: createWrapper(queryClient),
    });

    // Setup: localStorage has version 5
    useStorageStore.setState({
      systemConfig: { ...defaultConfig, version: 5 },
      serverVersion: 5,
    });

    // Server returns version 6
    mockServer.use(
      rest.get('/configuration', (req, res, ctx) => {
        return res(ctx.json({
          configuration: {
            systemConfig: { ...defaultConfig, version: 6 },
            currentLab: defaultLab,
          },
        }));
      })
    );

    await waitFor(() => {
      expect(result.current.isSynced).toBe(true);
    });

    // Verify cache was invalidated and updated
    const store = useStorageStore.getState();
    expect(store.systemConfig.version).toBe(6);
    expect(store.serverVersion).toBe(6);
  });

  it('should not invalidate cache when versions match', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Setup: localStorage and server both have version 5
    useStorageStore.setState({
      systemConfig: { ...defaultConfig, version: 5 },
      serverVersion: 5,
    });

    mockServer.use(
      rest.get('/configuration', (req, res, ctx) => {
        return res(ctx.json({
          configuration: {
            systemConfig: { ...defaultConfig, version: 5 },
            currentLab: defaultLab,
          },
        }));
      })
    );

    const { result } = renderHook(() => useConfigurationSync(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSynced).toBe(true);
    });

    // Verify cache was NOT invalidated
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
```

### 6.2 Integration Tests

**Test: End-to-End Version Flow**
```typescript
// configurationVersionFlow.test.ts
describe('Configuration Version Flow', () => {
  it('should sync version changes from server to client', async () => {
    // 1. Start with default configuration
    const { queryClient, socket } = setupTestEnvironment();
    const { result } = renderHook(() => useConfigurationSync(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSynced).toBe(true);
    });

    const initialVersion = useStorageStore.getState().systemConfig.version;
    expect(initialVersion).toBe(1);

    // 2. Admin updates configuration on server
    await request(app)
      .put('/api/configuration')
      .send({
        configuration: {
          systemConfig: { ...defaultConfig, version: 1 },
          currentLab: { ...defaultLab, name: 'Updated Lab' },
        },
      })
      .expect(200);

    // 3. Verify server version incremented
    const serverConfig = await configRepo.getCurrent();
    expect(serverConfig?.version).toBe(2);

    // 4. Simulate Socket.IO broadcast
    socket.emit('configuration_updated', {
      version: 2,
      updatedAt: new Date().toISOString(),
      changedBy: 'admin',
    });

    // 5. Verify client received update and synced
    await waitFor(() => {
      const store = useStorageStore.getState();
      expect(store.systemConfig.version).toBe(2);
      expect(store.currentLab.name).toBe('Updated Lab');
    });
  });
});
```

### 6.3 Manual Testing Checklist

#### Scenario 1: Fresh Install
- [ ] Open app for first time
- [ ] Verify default configuration loads (version: 1)
- [ ] Verify localStorage is created with version: 1
- [ ] Make configuration change
- [ ] Verify version increments to 2
- [ ] Refresh page
- [ ] Verify version 2 persists

#### Scenario 2: Version Mismatch
- [ ] Set localStorage version to 5 manually
- [ ] Reset server database (version: 1)
- [ ] Open app
- [ ] Verify warning message about version mismatch
- [ ] Verify client syncs to server version 1
- [ ] Verify localStorage updated to version 1

#### Scenario 3: Real-Time Updates
- [ ] Open app in two browser tabs
- [ ] In Tab 1: Update configuration (e.g., change lab name)
- [ ] In Tab 2: Verify notification appears
- [ ] In Tab 2: Verify configuration updates automatically
- [ ] Check localStorage in DevTools
- [ ] Verify version incremented in both tabs

#### Scenario 4: Offline Mode
- [ ] Open app (version: 5)
- [ ] Disable network in DevTools
- [ ] Verify app continues to work with cached data
- [ ] On server: Update configuration (version: 6)
- [ ] Re-enable network
- [ ] Verify app detects version mismatch
- [ ] Verify app syncs to version 6

#### Scenario 5: Multi-Tab Sync
- [ ] Open app in Tab 1 and Tab 2
- [ ] In Tab 1: Update configuration
- [ ] Verify Tab 1 receives Socket.IO event
- [ ] Verify Tab 2 receives Socket.IO event
- [ ] Verify both tabs show updated configuration
- [ ] Check localStorage (should have new version)
- [ ] Close Tab 1
- [ ] Verify Tab 2 still syncs correctly

---

## 7. Performance Considerations

### 7.1 Network Overhead

**Current State:**
- Configuration fetched once on app load
- 10-minute stale time (rare refetches)

**With Version Checking:**
- Same fetch frequency
- Additional version comparison (negligible CPU)
- Socket.IO adds ~100 bytes per event

**Impact:** ✅ Negligible performance impact

### 7.2 localStorage Operations

**Read Operations:**
- Zustand persist reads on app load: ~1-2ms
- Version comparison: <1ms

**Write Operations:**
- Zustand persist writes on state change: ~2-5ms
- Only writes when configuration actually changes

**Impact:** ✅ No noticeable performance degradation

### 7.3 React Query Cache

**Current State:**
- Single configuration query in cache
- ~50-100 KB cache size

**With Version Checking:**
- Same cache size
- Invalidation triggers refetch (existing behavior)

**Impact:** ✅ No additional memory overhead

### 7.4 Socket.IO

**Current State:**
- Connected for tubes and researchers
- ~5-10 events per minute (typical usage)

**With Configuration Events:**
- +1 event type
- Configuration updates are infrequent (<1 per hour typically)

**Impact:** ✅ Minimal bandwidth increase

---

## 8. Security Considerations

### 8.1 Version Tampering

**Risk:** User manually edits localStorage to set version to 999999

**Impact:**
- Version check detects mismatch (999999 !== actual server version)
- Client syncs from server
- Tampered version is overwritten

**Mitigation:** ✅ Automatic - version check enforces server authority

### 8.2 Socket.IO Event Spoofing

**Risk:** Malicious client sends fake `configuration_updated` events

**Impact:**
- Other clients invalidate cache unnecessarily
- Triggers harmless refetch from server
- Server version check ensures correct data

**Mitigation:**
- Socket.IO events should originate from server only
- Client cannot publish events to other clients (by default)
- ✅ Current Socket.IO setup is secure

**Additional Hardening (Optional):**
```typescript
// server/src/infrastructure/socket/SocketManager.ts

// Prevent clients from emitting configuration_updated
io.on('connection', (socket) => {
  // Blacklist client-to-server configuration events
  socket.on('configuration_updated', () => {
    console.warn(`⚠️ [Socket] Client attempted to emit configuration_updated (denied)`);
    // Ignore - only server can emit this event
  });
});
```

### 8.3 Cache Poisoning

**Risk:** Attacker injects malicious configuration into localStorage

**Impact:**
- Version check detects mismatch
- Malicious data overwritten by server sync
- Zod schema validation rejects invalid configuration

**Mitigation:** ✅ Multi-layer protection:
1. Version check enforces server authority
2. Zod schema validation rejects malformed data
3. React Query cache is memory-only (cleared on refresh)

---

## 9. Implementation Checklist

### Phase 1: Schema Alignment (Required First)
- [ ] Update `SystemConfigurationSchema` to use `z.number()` for version
- [ ] Update `storageStore.ts` default version from "2.0.0" to 1
- [ ] Update `ConfigurationDto.toResponse()` to include version in systemConfig
- [ ] Test schema validation with Zod
- [ ] Verify API responses match updated schema

### Phase 2: Version Tracking in Zustand
- [ ] Add `serverVersion: number | null` to `ConfigurationState`
- [ ] Add `setServerVersion()` action
- [ ] Add `checkVersionMismatch()` helper
- [ ] Update persist configuration to include serverVersion
- [ ] Test version persistence in localStorage

### Phase 3: Version-Based Cache Invalidation
- [ ] Update `useConfigurationSync` with version checking
- [ ] Update `useLoadStorageQuery` to check version on fetch
- [ ] Enable `refetchOnWindowFocus` in query config
- [ ] Add console logging for version mismatches
- [ ] Test version mismatch detection

### Phase 4: Socket.IO Real-Time Updates
- [ ] Add `EventBus.publish()` call in command handlers
- [ ] Implement `setupConfigurationEventHandlers()` in SocketQueryBridge
- [ ] Add `configuration_updated` event handler
- [ ] Update `initializeSocket()` to register handler
- [ ] Test real-time updates between tabs

### Phase 5: Edge Case Handling
- [ ] Add warning for older server version
- [ ] Implement multi-tab sync with storage event listener
- [ ] Add offline mode detection
- [ ] Test race condition scenarios
- [ ] Verify behavior on database reset

### Phase 6: Testing
- [ ] Write unit tests for version increment
- [ ] Write unit tests for version checking
- [ ] Write integration tests for end-to-end flow
- [ ] Run manual testing checklist
- [ ] Performance testing with DevTools

### Phase 7: Documentation
- [ ] Update API documentation with version field
- [ ] Document cache invalidation logic
- [ ] Add troubleshooting guide for version mismatches
- [ ] Update AGENTS.md with new patterns

---

## 10. Conclusion

### Summary

The configuration version field is **already implemented and functional** on the server side, with automatic version incrementing on every change. However, the client side **lacks version-based cache invalidation**, leading to stale data issues when the database is reset.

### Key Insights

1. **Version Field Works:** Server increments version correctly on all mutations
2. **Schema Mismatch:** Client expects `string`, server provides `number` - **must be fixed first**
3. **No Cache Invalidation:** Zustand persist caches data indefinitely without version checks
4. **No Real-Time Updates:** Socket.IO doesn't broadcast configuration changes
5. **Clear Implementation Path:** Follow established patterns from tubes and researchers

### Implementation Complexity

**Estimated Effort:** 4-6 hours for complete implementation

**Breakdown:**
- Phase 1 (Schema Alignment): 1 hour
- Phase 2 (Version Tracking): 1 hour
- Phase 3 (Cache Invalidation): 1.5 hours
- Phase 4 (Socket.IO): 1 hour
- Phase 5 (Edge Cases): 1 hour
- Phase 6 (Testing): 1-2 hours

**Risk Level:** Low - follows existing patterns, no breaking changes

### Recommended Approach

1. **Start with Schema Alignment (Phase 1)** - Critical foundation
2. **Implement Version Tracking (Phase 2)** - Core functionality
3. **Add Cache Invalidation (Phase 3)** - Solves immediate problem
4. **Add Socket.IO (Phase 4)** - Improves user experience
5. **Handle Edge Cases (Phase 5)** - Production readiness
6. **Comprehensive Testing (Phase 6)** - Ensure reliability

### Benefits

- ✅ Always shows latest configuration after database reset
- ✅ Real-time updates across all connected clients
- ✅ Multi-tab synchronization
- ✅ Offline resilience with automatic sync on reconnect
- ✅ Type-safe version comparison
- ✅ Follows established architectural patterns

---

## Appendix A: File References

### Server Files
- **Configuration Entity:** `server/src/domain/entities/Configuration.ts` (Lines 18-771)
- **Configuration Repository:** `server/src/infrastructure/repositories/SQLiteConfigurationRepository.ts` (Lines 1-1135)
- **Configuration Controller:** `server/src/presentation/controllers/ConfigurationController.ts` (Lines 1-497)
- **Command Handlers:** `server/src/application/commands/ConfigurationCommands.ts` (Lines 1-591)
- **Database Schema:** `server/src/infrastructure/database/SQLiteContext.ts` (Lines 410-443)

### Client Files
- **Storage Store:** `client/src/domains/storage/stores/storageStore.ts` (Lines 1-798)
- **Storage Queries:** `client/src/domains/storage/hooks/useStorageQuery.ts` (Lines 1-133)
- **Configuration Sync:** `client/src/domains/storage/hooks/useConfigurationSync.ts` (Lines 1-75)
- **Storage Service:** `client/src/domains/storage/services/StorageService.ts` (Lines 1-193)
- **Socket Bridge:** `client/src/infrastructure/socket/queryBridge.ts` (Lines 1-453)
- **Query Keys:** `client/src/app/queryKeys.ts` (Lines 1-78)

### Shared Files
- **Configuration Schemas:** `packages/shared-schemas/src/storage/configurationSchemas.ts` (Lines 1-158)
- **System Defaults:** `packages/shared-schemas/src/constants/systemDefaults.ts` (Lines 1-74)

---

## Appendix B: Type Definitions

### Server Types
```typescript
// Configuration Entity
class Configuration {
  private _version: number;  // Increments on every mutation

  get version(): number { return this._version; }

  toApiData(): {
    equipment: { tanks: Tank[] };
    systemSettings: SystemSettings;
    metadata: {
      updatedAt: string;
      version: number;  // API response includes version
    };
  }
}
```

### Client Types
```typescript
// SystemConfiguration (shared-schemas)
type SystemConfiguration = {
  currentLabId: string;
  availableLabs: LabConfiguration[];
  globalSettings: GlobalSettings;
  version: string;  // ⚠️ Mismatch: should be number
};

// ConfigurationResponse (shared-schemas)
type ConfigurationResponse = {
  configuration: {
    systemConfig: SystemConfiguration;
    currentLab: LabConfiguration;
  };
};

// Zustand Store State
interface ConfigurationState {
  systemConfig: SystemConfiguration;
  currentLab: LabConfiguration;
  serverVersion: number | null;  // ✅ Proposed addition

  setServerVersion: (version: number) => void;
  checkVersionMismatch: () => boolean;
}
```

### Socket Event Types
```typescript
// Configuration Updated Event
type ConfigurationUpdatedEvent = {
  type: 'configuration_updated';
  payload: {
    version: number;
    updatedAt: string;
    changedBy: string;
  };
};
```

---

**Report Generated:** 2025-01-07
**Author:** Claude (Anthropic AI)
**Review Status:** Ready for Implementation
