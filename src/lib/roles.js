// User roles (saved as text in the user's `role` field).
// The text must match what the API accepts exactly (bizhub-api/src/util/user_roles.js).
export const ROLE = {
  SUPER: "super_admin", // is_super_admin flag from the API (not a selectable role)
  ADMIN: "អ្នកគ្រប់គ្រងប្រព័ន្ធ", // everything
  STAFF: "បុគ្គលិក", // view only
  CUSTOMER: "customer", // business owner (account_type "customer"), not a team role
};

export const USER_ROLES = [ROLE.ADMIN, ROLE.STAFF];
export const ROLE_OPTIONS = USER_ROLES.map((r) => ({ value: r, label: r }));

// the API may return a plain string, or (older data) an object with a name
export const roleText = (role) => (typeof role === "string" ? role : role?.name || "");
