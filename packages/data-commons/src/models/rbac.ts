export enum AppUserRole {
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

export const ROLE_HIERARCHY: Record<AppUserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export const hasMinimumRole = (userRole: AppUserRole, minRole: AppUserRole): boolean => {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
};
