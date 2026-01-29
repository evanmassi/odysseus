export interface User {
  id: string;
  username: string;
  lastActivity: string;
  role?: 'admin' | 'user';
  researcherId?: string;
}

export interface AuthCredentials {
  username: string;
  apiKey: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}
