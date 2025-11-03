# Enterprise Architecture Foundation Plan
**Goal:** Industry-standard, enterprise-grade architecture  
**Principles:** Zero technical debt, maximum maintainability, scalable foundation  
**Approach:** Build proper architectural patterns from the ground up  

---

## 🏛️ **Architectural Principles**

### **1. Hexagonal Architecture (Ports & Adapters)**
- **Domain** at the center, isolated from external concerns
- **Application** layer orchestrates domain logic
- **Infrastructure** implements adapters for external systems
- **Presentation** handles HTTP/UI concerns only

### **2. Interface-Based Design**
- All dependencies flow through interfaces
- Implementations are swappable
- Zero coupling to concrete implementations
- Proper dependency inversion throughout

### **3. Command Query Responsibility Segregation (CQRS)**
- Commands modify state (write operations)
- Queries read state (read operations)  
- Clear separation of read/write concerns
- Optimized for different access patterns

### **4. Event-Driven Architecture**
- Domain events for cross-boundary communication
- Decoupled components via event bus
- Audit trail through event sourcing
- Integration events for external systems

---

## 🏗️ **Phase 1: Core Architecture Foundation (2 hours)**

### **1.1: Directory Structure (Industry Standard)**
```
server/src/
├── domain/                     # Pure business logic
│   ├── entities/              # Domain entities
│   ├── value-objects/         # Value objects
│   ├── services/              # Domain services
│   ├── events/                # Domain events
│   ├── repositories/          # Repository interfaces
│   └── errors/                # Domain exceptions
├── application/               # Application orchestration
│   ├── commands/              # Command handlers (CQRS)
│   ├── queries/               # Query handlers (CQRS)
│   ├── events/                # Event handlers
│   ├── services/              # Application services
│   └── contracts/             # Application interfaces
├── infrastructure/            # External concerns
│   ├── persistence/           # Database implementations
│   ├── external/              # External service adapters
│   ├── events/                # Event bus implementation
│   ├── security/              # Security implementations
│   ├── configuration/         # Config management
│   └── monitoring/            # Observability
├── presentation/              # HTTP/API layer
│   ├── controllers/           # HTTP controllers
│   ├── middleware/            # HTTP middleware
│   ├── routes/                # Route modules
│   ├── validation/            # Request validation
│   └── responses/             # Response formatting
└── shared/                    # Cross-cutting concerns
    ├── types/                 # Shared TypeScript types
    ├── constants/             # Application constants
    └── utils/                 # Utility functions
```

### **1.2: Interface-Based Repository Pattern**
```typescript
// domain/repositories/IUserRepository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  isEmpty(): Promise<boolean>;
  findAll(): Promise<User[]>;
}

// domain/repositories/ITubeRepository.ts  
export interface ITubeRepository {
  findById(id: string): Promise<Tube | null>;
  findByLocation(location: Location): Promise<Tube | null>;
  findByRackAndBox(rackId: number, boxName: string): Promise<Tube[]>;
  save(tube: Tube): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Tube[]>;
  search(criteria: SearchCriteria): Promise<Tube[]>;
}

// infrastructure/persistence/repositories/SqliteUserRepository.ts
export class SqliteUserRepository implements IUserRepository {
  constructor(private context: SqliteContext) {}
  
  async isEmpty(): Promise<boolean> {
    // Implementation with proper business rules
    const count = await this.context.queryOne<{count: number}>(`
      SELECT COUNT(*) as count FROM users 
      WHERE role IN ('admin', 'user') 
      AND status = 'active'
      AND username NOT LIKE 'system_%'
    `);
    return (count?.count || 0) === 0;
  }
  
  // ... other methods
}
```

### **1.3: CQRS Command/Query Pattern**
```typescript
// application/commands/CreateUserCommand.ts
export interface CreateUserCommand {
  username: string;
  password: string;
  role: UserRole;
}

export class CreateUserCommandHandler {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: IPasswordService,
    private eventBus: IEventBus
  ) {}

  async handle(command: CreateUserCommand): Promise<User> {
    // Validate command
    if (await this.userRepository.findByUsername(command.username)) {
      throw new UserAlreadyExistsError(command.username);
    }

    // Create domain entity
    const hashedPassword = await this.passwordService.hash(command.password);
    const user = User.create(command.username, hashedPassword, command.role);

    // Persist
    await this.userRepository.save(user);

    // Publish domain event
    await this.eventBus.publish(new UserCreatedEvent(user.id, user.username, user.role));

    return user;
  }
}

// application/queries/GetUserQuery.ts
export interface GetUserQuery {
  id: string;
}

export class GetUserQueryHandler {
  constructor(private userRepository: IUserRepository) {}

  async handle(query: GetUserQuery): Promise<User | null> {
    return this.userRepository.findById(query.id);
  }
}
```

### **1.4: Domain Events Architecture**
```typescript
// domain/events/DomainEvent.ts
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;
  
  constructor() {
    this.occurredOn = new Date();
    this.eventId = crypto.randomUUID();
  }
  
  abstract eventName(): string;
}

// domain/events/UserCreatedEvent.ts
export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly role: UserRole
  ) {
    super();
  }
  
  eventName(): string {
    return 'UserCreated';
  }
}

// infrastructure/events/EventBus.ts
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;
}

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName()) || [];
    await Promise.all(handlers.map(handler => handler.handle(event)));
  }

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventName) || [];
    handlers.push(handler);
    this.handlers.set(eventName, handlers);
  }
}
```

---

## 🏗️ **Phase 2: Presentation Layer Architecture (1.5 hours)**

### **2.1: Modular Route System**
```typescript
// presentation/routes/IRouteModule.ts
export interface IRouteModule {
  configure(router: Router): void;
  getBasePath(): string;
  getMiddleware(): RequestHandler[];
}

// presentation/routes/PublicRouteModule.ts
export class PublicRouteModule implements IRouteModule {
  constructor(
    private authController: AuthController,
    private validationService: IValidationService,
    private rateLimiter: IRateLimiter
  ) {}

  getBasePath(): string {
    return '/api/public';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.rateLimiter.create({ windowMs: 15 * 60 * 1000, max: 100 }),
      this.validationService.middleware(),
      sanitizationMiddleware
    ];
  }

  configure(router: Router): void {
    router.get('/auth/first-time', this.authController.checkFirstTime.bind(this.authController));
    router.post('/auth/register', 
      this.validationService.validate(CreateUserSchema),
      this.authController.register.bind(this.authController)
    );
    router.post('/auth/login',
      this.validationService.validate(LoginSchema), 
      this.authController.login.bind(this.authController)
    );
  }
}

// presentation/routes/ProtectedRouteModule.ts
export class ProtectedRouteModule implements IRouteModule {
  constructor(
    private authController: AuthController,
    private tubeController: TubeController,
    private authMiddleware: IAuthMiddleware
  ) {}

  getBasePath(): string {
    return '/api';
  }

  getMiddleware(): RequestHandler[] {
    return [
      this.authMiddleware.authenticate(),
      rateLimitMiddleware,
      validationMiddleware
    ];
  }

  configure(router: Router): void {
    // Auth endpoints
    router.get('/auth/verify', this.authController.verifySession.bind(this.authController));
    router.get('/auth/me', this.authController.getCurrentUser.bind(this.authController));
    
    // Tube endpoints
    router.get('/tubes', this.tubeController.getAllTubes.bind(this.tubeController));
    router.post('/tubes', 
      this.validationService.validate(CreateTubeSchema),
      this.tubeController.createTube.bind(this.tubeController)
    );
  }
}

// presentation/routes/RouteRegistrar.ts
export class RouteRegistrar {
  constructor(
    private app: Express,
    private modules: IRouteModule[]
  ) {}

  registerAll(): void {
    this.modules.forEach(module => {
      const router = Router();
      
      // Apply module-specific middleware
      router.use(module.getMiddleware());
      
      // Configure routes
      module.configure(router);
      
      // Register with app
      this.app.use(module.getBasePath(), router);
    });
    
    // Global error handler
    this.app.use(this.globalErrorHandler);
    
    // 404 handler
    this.app.use('*', this.notFoundHandler);
  }
}
```

### **2.2: Standardized Response System**
```typescript
// presentation/responses/ApiResponse.ts
export class ApiResponse<T = any> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: ApiError,
    public readonly meta?: ResponseMetadata
  ) {}

  static success<T>(data: T, meta?: Partial<ResponseMetadata>): ApiResponse<T> {
    return new ApiResponse(true, data, undefined, {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
      ...meta
    });
  }

  static error(error: ApiError, meta?: Partial<ResponseMetadata>): ApiResponse {
    return new ApiResponse(false, undefined, error, {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
      ...meta
    });
  }

  static paginated<T>(
    data: T[], 
    pagination: PaginationInfo,
    meta?: Partial<ResponseMetadata>
  ): ApiResponse<T[]> {
    return new ApiResponse(true, data, undefined, {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
      pagination,
      ...meta
    });
  }
}

// presentation/responses/ErrorMapper.ts
export class ErrorMapper {
  private static errorMap = new Map<string, (error: Error) => ApiError>([
    ['UserAlreadyExistsError', (error) => new ApiError('USER_EXISTS', error.message, 409)],
    ['InvalidCredentialsError', (error) => new ApiError('INVALID_CREDENTIALS', error.message, 401)],
    ['ValidationError', (error) => new ApiError('VALIDATION_FAILED', error.message, 400)],
    ['NotFoundError', (error) => new ApiError('NOT_FOUND', error.message, 404)],
    ['UnauthorizedError', (error) => new ApiError('UNAUTHORIZED', error.message, 401)],
    ['ForbiddenError', (error) => new ApiError('FORBIDDEN', error.message, 403)]
  ]);

  static mapError(error: Error): ApiError {
    const mapper = this.errorMap.get(error.constructor.name);
    if (mapper) {
      return mapper(error);
    }
    
    // Unknown error - don't leak internals
    return new ApiError(
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
      500
    );
  }
}
```

### **2.3: Enterprise Controller Pattern**
```typescript
// presentation/controllers/AuthController.ts
export class AuthController {
  constructor(
    private createUserHandler: CreateUserCommandHandler,
    private getUserHandler: GetUserQueryHandler,
    private checkFirstTimeHandler: CheckFirstTimeQueryHandler,
    private loginHandler: LoginCommandHandler,
    private logger: ILogger
  ) {}

  async checkFirstTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = new CheckFirstTimeQuery();
      const result = await this.checkFirstTimeHandler.handle(query);
      
      const response = ApiResponse.success({ isFirstTime: result });
      res.status(200).json(response);
      
      this.logger.info('First-time check completed', { isFirstTime: result });
    } catch (error) {
      next(error); // Let global error handler manage it
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const command = new CreateUserCommand(
        req.body.username,
        req.body.password,
        req.body.role || UserRole.ADMIN
      );
      
      const user = await this.createUserHandler.handle(command);
      const response = ApiResponse.success(user.toPublicData());
      
      res.status(201).json(response);
      
      this.logger.info('User registered successfully', { 
        userId: user.id, 
        username: user.username 
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const command = new LoginCommand(req.body.username, req.body.password);
      const { user, sessionToken } = await this.loginHandler.handle(command);
      
      const response = ApiResponse.success({
        user: user.toPublicData(),
        sessionToken
      });
      
      res.status(200).json(response);
      
      this.logger.info('User logged in successfully', { 
        userId: user.id,
        username: user.username 
      });
    } catch (error) {
      next(error);
    }
  }
}
```

---

## 🏗️ **Phase 3: Security Architecture (1 hour)**

### **3.1: Enterprise Authentication System**
```typescript
// infrastructure/security/IAuthenticationService.ts
export interface IAuthenticationService {
  authenticate(token: string): Promise<AuthenticationResult>;
  createSession(user: User): Promise<SessionToken>;
  validateSession(token: string): Promise<User | null>;
  revokeSession(token: string): Promise<void>;
}

// infrastructure/security/JwtAuthenticationService.ts
export class JwtAuthenticationService implements IAuthenticationService {
  constructor(
    private userRepository: IUserRepository,
    private sessionRepository: ISessionRepository,
    private configService: IConfigService,
    private logger: ILogger
  ) {}

  async createSession(user: User): Promise<SessionToken> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.configService.getSessionTTL());
    
    // Create session record
    const session = new Session(sessionId, user.id, expiresAt);
    await this.sessionRepository.save(session);
    
    // Create JWT with session reference
    const payload = {
      sessionId,
      userId: user.id,
      username: user.username,
      role: user.role.value,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };
    
    const token = jwt.sign(payload, this.configService.getJwtSecret(), {
      algorithm: 'HS256',
      issuer: 'odysseus-api',
      audience: 'odysseus-client'
    });
    
    this.logger.info('Session created', { 
      sessionId, 
      userId: user.id, 
      expiresAt 
    });
    
    return new SessionToken(token, expiresAt);
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, this.configService.getJwtSecret()) as any;
      
      // Check session exists and is valid
      const session = await this.sessionRepository.findById(payload.sessionId);
      if (!session || session.isExpired()) {
        return null;
      }
      
      // Get current user data
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive()) {
        return null;
      }
      
      return user;
    } catch (error) {
      this.logger.warn('Session validation failed', { error: error.message });
      return null;
    }
  }
}

// infrastructure/security/AuthMiddleware.ts
export class AuthMiddleware implements IAuthMiddleware {
  constructor(
    private authService: IAuthenticationService,
    private logger: ILogger
  ) {}

  authenticate() {
    return async (req: any, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new UnauthorizedError('Authorization header required');
        }

        const token = authHeader.substring(7);
        const user = await this.authService.validateSession(token);
        
        if (!user) {
          throw new UnauthorizedError('Invalid or expired session');
        }

        req.user = user;
        req.sessionToken = token;
        
        this.logger.debug('User authenticated', { 
          userId: user.id, 
          username: user.username 
        });
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  requireRole(role: UserRole) {
    return async (req: any, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      if (!req.user.hasRole(role)) {
        return next(new ForbiddenError(`${role.value} access required`));
      }

      next();
    };
  }
}
```

### **3.2: Configuration Management System**
```typescript
// infrastructure/configuration/IConfigService.ts
export interface IConfigService {
  getDatabaseUrl(): string;
  getJwtSecret(): string;
  getSessionTTL(): number;
  getPort(): number;
  isProduction(): boolean;
  getCorsOrigins(): string[];
  getRateLimitConfig(): RateLimitConfig;
}

// infrastructure/configuration/EnvironmentConfigService.ts
export class EnvironmentConfigService implements IConfigService {
  private config: ConfigData;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): ConfigData {
    return {
      database: {
        url: process.env.DATABASE_URL || this.getDefaultDatabasePath()
      },
      security: {
        jwtSecret: process.env.JWT_SECRET || this.generateSecretKey(),
        sessionTTL: parseInt(process.env.SESSION_TTL || '86400000'), // 24 hours
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
      },
      server: {
        port: parseInt(process.env.PORT || '3001'),
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173']
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100')
      },
      environment: process.env.NODE_ENV || 'development'
    };
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    if (!this.config.security.jwtSecret || this.config.security.jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    if (this.config.security.sessionTTL < 3600000) { // 1 hour minimum
      errors.push('SESSION_TTL must be at least 3600000 (1 hour)');
    }

    if (errors.length > 0) {
      throw new ConfigurationError(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  getDatabaseUrl(): string {
    return this.config.database.url;
  }

  getJwtSecret(): string {
    return this.config.security.jwtSecret;
  }

  getSessionTTL(): number {
    return this.config.security.sessionTTL;
  }

  // ... other methods
}
```

---

## 🏗️ **Phase 4: Frontend Architecture (2 hours)**

### **4.1: Service Interface Architecture**
```typescript
// client/src/application/contracts/IAuthenticationService.ts
export interface IAuthenticationService {
  checkFirstTime(): Promise<boolean>;
  register(credentials: RegisterCredentials): Promise<AuthenticationResult>;
  login(credentials: LoginCredentials): Promise<AuthenticationResult>;
  validateSession(): Promise<User | null>;
  logout(): Promise<void>;
}

// client/src/application/contracts/ITubeService.ts
export interface ITubeService {
  getAllTubes(): Promise<Tube[]>;
  getTubeById(id: string): Promise<Tube | null>;
  createTube(tubeData: CreateTubeRequest): Promise<Tube>;
  updateTube(id: string, tubeData: UpdateTubeRequest): Promise<Tube>;
  deleteTube(id: string): Promise<void>;
  searchTubes(criteria: SearchCriteria): Promise<SearchResult<Tube>>;
}

// client/src/infrastructure/api/HttpAuthenticationService.ts
export class HttpAuthenticationService implements IAuthenticationService {
  constructor(
    private httpClient: IHttpClient,
    private tokenStorage: ITokenStorage,
    private logger: ILogger
  ) {}

  async checkFirstTime(): Promise<boolean> {
    try {
      const response = await this.httpClient.get<{ isFirstTime: boolean }>('/api/public/auth/first-time');
      return response.data.isFirstTime;
    } catch (error) {
      this.logger.warn('First-time check failed, defaulting to registration flow', error);
      return true; // Fail-safe: show registration
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthenticationResult> {
    const response = await this.httpClient.post<AuthenticationResult>(
      '/api/public/auth/register',
      {
        username: credentials.username,
        password: credentials.password,
        role: credentials.role || 'admin'
      }
    );

    // Store session token
    await this.tokenStorage.store(response.data.sessionToken);
    
    this.logger.info('User registered successfully', { 
      username: credentials.username 
    });

    return response.data;
  }

  async validateSession(): Promise<User | null> {
    try {
      const token = await this.tokenStorage.retrieve();
      if (!token) return null;

      const response = await this.httpClient.get<{ user: User }>('/api/auth/verify');
      return response.data.user;
    } catch (error) {
      // Session invalid - clean up
      await this.tokenStorage.clear();
      return null;
    }
  }
}
```

### **4.2: HTTP Client Architecture**
```typescript
// client/src/infrastructure/http/IHttpClient.ts
export interface IHttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
}

// client/src/infrastructure/http/FetchHttpClient.ts
export class FetchHttpClient implements IHttpClient {
  constructor(
    private baseURL: string,
    private tokenStorage: ITokenStorage,
    private logger: ILogger
  ) {}

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseURL}${url}`;
    
    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config?.headers
    };

    // Add auth token if available and not explicitly excluded
    if (!config?.skipAuth) {
      const token = await this.tokenStorage.retrieve();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // Make request
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...config?.fetchOptions
    });

    // Parse response
    const responseData = await response.json();

    // Handle HTTP errors
    if (!response.ok) {
      const error = new HttpError(
        responseData.error?.message || `HTTP ${response.status}`,
        response.status,
        responseData.error?.code
      );
      
      this.logger.error('HTTP request failed', {
        method,
        url: fullUrl,
        status: response.status,
        error: error.message
      });
      
      throw error;
    }

    // Validate response format
    if (!this.isValidApiResponse(responseData)) {
      throw new HttpError('Invalid API response format', response.status);
    }

    this.logger.debug('HTTP request successful', {
      method,
      url: fullUrl,
      status: response.status
    });

    return responseData;
  }

  private isValidApiResponse(data: any): data is ApiResponse<any> {
    return typeof data === 'object' && 
           data !== null && 
           typeof data.success === 'boolean';
  }
}
```

### **4.3: State Management Architecture**
```typescript
// client/src/application/state/IStore.ts
export interface IStore<T> {
  getState(): T;
  subscribe(listener: (state: T) => void): () => void;
  dispatch(action: Action): void;
}

// client/src/application/state/AuthStore.ts
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstTime: boolean | null;
  error: string | null;
}

export class AuthStore implements IStore<AuthState> {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isFirstTime: null,
    error: null
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor(
    private authService: IAuthenticationService,
    private logger: ILogger
  ) {}

  getState(): AuthState {
    return { ...this.state };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  dispatch(action: AuthAction): void {
    switch (action.type) {
      case 'CHECK_FIRST_TIME':
        this.handleCheckFirstTime();
        break;
      case 'REGISTER':
        this.handleRegister(action.payload);
        break;
      case 'LOGIN':
        this.handleLogin(action.payload);
        break;
      case 'VERIFY_SESSION':
        this.handleVerifySession();
        break;
      case 'LOGOUT':
        this.handleLogout();
        break;
    }
  }

  private async handleCheckFirstTime(): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const isFirstTime = await this.authService.checkFirstTime();
      this.setState({ isFirstTime, isLoading: false });
    } catch (error) {
      this.logger.error('First-time check failed', error);
      this.setState({ 
        isFirstTime: true, // Fail-safe
        isLoading: false,
        error: error.message 
      });
    }
  }

  private async handleRegister(credentials: RegisterCredentials): Promise<void> {
    this.setState({ isLoading: true, error: null });
    
    try {
      const result = await this.authService.register(credentials);
      this.setState({
        user: result.user,
        isAuthenticated: true,
        isFirstTime: false,
        isLoading: false
      });
      
      this.logger.info('Registration successful', { username: credentials.username });
    } catch (error) {
      this.setState({
        error: error.message,
        isLoading: false
      });
      throw error;
    }
  }

  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
```

---

## 🏗️ **Phase 5: Testing Architecture (1 hour)**

### **5.1: Testing Foundation**
```typescript
// tests/unit/domain/entities/User.test.ts
describe('User Entity', () => {
  describe('creation', () => {
    it('should create user with valid data', () => {
      const user = User.create('testuser', 'hashedpass', UserRole.ADMIN);
      
      expect(user.username).toBe('testuser');
      expect(user.role).toEqual(UserRole.ADMIN);
      expect(user.isActive()).toBe(true);
    });

    it('should reject invalid username', () => {
      expect(() => User.create('', 'hashedpass', UserRole.ADMIN))
        .toThrow('Username cannot be empty');
    });
  });

  describe('role management', () => {
    it('should check admin role correctly', () => {
      const admin = User.create('admin', 'hashedpass', UserRole.ADMIN);
      const user = User.create('user', 'hashedpass', UserRole.USER);
      
      expect(admin.hasRole(UserRole.ADMIN)).toBe(true);
      expect(user.hasRole(UserRole.ADMIN)).toBe(false);
    });
  });
});

// tests/integration/application/commands/CreateUserCommandHandler.test.ts
describe('CreateUserCommandHandler Integration', () => {
  let handler: CreateUserCommandHandler;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;
  let mockEventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    mockUserRepo = {
      findByUsername: jest.fn(),
      save: jest.fn(),
      // ... other methods
    } as jest.Mocked<IUserRepository>;

    mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn()
    } as jest.Mocked<IPasswordService>;

    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    } as jest.Mocked<IEventBus>;

    handler = new CreateUserCommandHandler(
      mockUserRepo,
      mockPasswordService,
      mockEventBus
    );
  });

  it('should create user successfully', async () => {
    // Arrange
    const command = new CreateUserCommand('testuser', 'password123', UserRole.ADMIN);
    mockUserRepo.findByUsername.mockResolvedValue(null);
    mockPasswordService.hash.mockResolvedValue('hashedpassword');

    // Act
    const result = await handler.handle(command);

    // Assert
    expect(result.username).toBe('testuser');
    expect(mockUserRepo.save).toHaveBeenCalledWith(result);
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.any(UserCreatedEvent)
    );
  });

  it('should reject duplicate username', async () => {
    // Arrange
    const command = new CreateUserCommand('existing', 'password123', UserRole.ADMIN);
    const existingUser = User.create('existing', 'hashedpass', UserRole.USER);
    mockUserRepo.findByUsername.mockResolvedValue(existingUser);

    // Act & Assert
    await expect(handler.handle(command))
      .rejects
      .toThrow(UserAlreadyExistsError);
  });
});
```

---

## 🏗️ **Phase 6: Dependency Injection Container (30 minutes)**

### **6.1: Enterprise DI Container**
```typescript
// infrastructure/di/Container.ts
export class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  // Register singleton service
  singleton<T>(token: string, instance: T): void {
    this.services.set(token, instance);
  }

  // Register factory function
  factory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  // Register interface implementation
  bind<T>(token: string, implementation: new (...args: any[]) => T, dependencies: string[] = []): void {
    this.factory(token, () => {
      const deps = dependencies.map(dep => this.resolve(dep));
      return new implementation(...deps);
    });
  }

  // Resolve service
  resolve<T>(token: string): T {
    // Check for singleton first
    if (this.services.has(token)) {
      return this.services.get(token);
    }

    // Check for factory
    if (this.factories.has(token)) {
      const instance = this.factories.get(token)!();
      return instance;
    }

    throw new Error(`Service ${token} not registered`);
  }
}

// infrastructure/di/ServiceRegistration.ts
export class ServiceRegistration {
  static configure(container: Container): void {
    // Configuration
    container.singleton('IConfigService', new EnvironmentConfigService());

    // Logging
    container.singleton('ILogger', new WinstonLogger());

    // Database
    container.factory('SqliteContext', () => {
      const config = container.resolve<IConfigService>('IConfigService');
      return new SqliteContext(config.getDatabaseUrl());
    });

    // Repositories
    container.bind('IUserRepository', SqliteUserRepository, ['SqliteContext']);
    container.bind('ITubeRepository', SqliteTubeRepository, ['SqliteContext']);

    // Services
    container.bind('IPasswordService', BcryptPasswordService, ['IConfigService']);
    container.bind('IAuthenticationService', JwtAuthenticationService, [
      'IUserRepository', 
      'IConfigService', 
      'ILogger'
    ]);

    // Event system
    container.singleton('IEventBus', new InMemoryEventBus());

    // Command handlers
    container.bind('CreateUserCommandHandler', CreateUserCommandHandler, [
      'IUserRepository',
      'IPasswordService', 
      'IEventBus'
    ]);

    // Query handlers
    container.bind('GetUserQueryHandler', GetUserQueryHandler, ['IUserRepository']);
    container.bind('CheckFirstTimeQueryHandler', CheckFirstTimeQueryHandler, ['IUserRepository']);

    // Controllers
    container.bind('AuthController', AuthController, [
      'CreateUserCommandHandler',
      'GetUserQueryHandler',
      'CheckFirstTimeQueryHandler',
      'ILogger'
    ]);

    // Middleware
    container.bind('AuthMiddleware', AuthMiddleware, ['IAuthenticationService', 'ILogger']);
  }
}
```

---

## 🎯 **Implementation Timeline**

### **Week 1: Foundation**
- **Day 1-2:** Phase 1 - Core architecture setup
- **Day 3-4:** Phase 2 - Presentation layer
- **Day 5:** Phase 6 - DI container

### **Week 2: Security & Frontend**
- **Day 1-2:** Phase 3 - Security architecture
- **Day 3-5:** Phase 4 - Frontend architecture

### **Week 3: Testing & Polish**
- **Day 1-2:** Phase 5 - Testing architecture
- **Day 3-5:** Integration testing and documentation

---

## 🏆 **Success Criteria**

### **Architecture Quality**
- ✅ **Zero coupling** to external dependencies in domain layer
- ✅ **Interface-based design** throughout application  
- ✅ **CQRS pattern** for clear read/write separation
- ✅ **Event-driven** communication between bounded contexts
- ✅ **Modular route system** with proper middleware application

### **Security Standards**
- ✅ **Enterprise authentication** with proper session management
- ✅ **Role-based authorization** with fine-grained permissions
- ✅ **Configuration security** with environment-based secrets
- ✅ **Input validation** at multiple layers

### **Maintainability** 
- ✅ **Comprehensive test coverage** (unit, integration, e2e)
- ✅ **Proper error handling** with classification and logging
- ✅ **Clear separation of concerns** across all layers
- ✅ **Dependency injection** for testability and flexibility

### **Functionality**
- ✅ **Fresh installation** → RegisterModal → Admin creation → Main app
- ✅ **Session persistence** across app restarts
- ✅ **Proper error messages** for all failure scenarios
- ✅ **Enterprise scalability** for multi-lab deployments

This architecture provides a **true enterprise foundation** that any professional development team can maintain, extend, and scale for years to come.
