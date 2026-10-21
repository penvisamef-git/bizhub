import { ROLE, roleText } from "./roles";
import { authService, customerAuthService } from "../api/services";

/**
 * Two kinds of accounts log in to /app:
 *   customer  business owners who signed up on the website (account_type "customer")
 *   team      BizHub staff: super admin, ADMIN, STAFF (account_type "team")
 *
 * What each screen needs (put one on a nav item / route as `access`):
 *   ALL       anyone logged in (my account, settings)
 *   CUSTOMER  customer screens: dashboard, businesses, name card, wallet
 *   ADMIN     team pages: users, activity log → ADMIN + super admin
 *   SUPER     super admin dashboard, customers, businesses, coins, website → super admin only
 */
export const ACCESS = { ALL: "all", CUSTOMER: "customer", ADMIN: "admin", SUPER: "super" };

export const isCustomer = (user) => user?.account_type === "customer";

export function roleOf(user) {
  if (isCustomer(user)) return ROLE.CUSTOMER;
  if (user?.is_super_admin) return ROLE.SUPER;
  return roleText(user?.role);
}

export function canAccess(user, access = ACCESS.ADMIN) {
  if (!user) return false;
  if (access === ACCESS.ALL) return true;
  const role = roleOf(user);
  if (access === ACCESS.CUSTOMER) return role === ROLE.CUSTOMER;
  if (role === ROLE.CUSTOMER) return false;
  if (role === ROLE.SUPER) return true;
  if (access === ACCESS.SUPER) return false;
  return role === ROLE.ADMIN; // ACCESS.ADMIN
}

// First screen after login
export function homeFor(user) {
  const role = roleOf(user);
  if (role === ROLE.CUSTOMER) return "/app/dashboard";
  if (role === ROLE.SUPER) return "/app/super-admin/dashboard";
  if (role === ROLE.ADMIN) return "/app/admin/users";
  return "/app/account";
}

// The right "me" / "logout" calls for this account
export const authFor = (user) => (isCustomer(user) ? customerAuthService : authService);

// Keep the stored login in sync with the server (role changed, coins changed…). Returns true if changed.
export async function refreshLoginRole(auth) {
  try {
    const current = auth.getClientLogin();
    if (!current) return false;
    const fresh = (await authFor(current).me())?.data;
    if (!fresh || typeof fresh !== "object") return false;
    const next = { ...current };
    let changed = false;
    ["role", "is_super_admin", "firstname", "lastname", "is_first_login", "name", "phone", "coin_balance"].forEach((key) => {
      if (fresh[key] !== undefined && JSON.stringify(fresh[key]) !== JSON.stringify(current[key])) {
        next[key] = fresh[key];
        changed = true;
      }
    });
    if (changed) auth.setClientLogin(next);
    return changed;
  } catch {
    return false;
  }
}
