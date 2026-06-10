// JWT token payload type — used by middleware and service layers
import { UserRole } from '../constants/roles';

export interface TokenPayload {
  sub: string;   // user ID
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
