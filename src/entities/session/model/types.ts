export interface Session {
  authenticated: true;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
