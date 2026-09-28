export interface LoginRequest {
  email: string;
  password: string;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
}

/** Short-lived demo session. `expiresAt` is an ISO timestamp. */
export interface AuthSession {
  token: string;
  expiresAt: string;
  user: DemoUser;
}
