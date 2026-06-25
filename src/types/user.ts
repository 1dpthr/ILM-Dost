export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
    role: UserRole;
  };
}
