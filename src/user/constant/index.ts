import { Role } from '@prisma/client';

export type UpdateUser = {
  names?: string;
  surnames?: string;
  document?: string;
  address?: string;
  telephone_number?: string;
  image?: string;
  role?: Role;
  status?: boolean;
  email?: string;
};
