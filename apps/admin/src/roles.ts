import type { Role } from '@dm/shared';

const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export const roleAtLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];
