import { NAV } from "./constants";
import type { Customer, ModuleKey, RoleConfig, State, User } from "./types";

export function currentUser(state: State): User | null {
  return state.users.find((user) => user.id === state.sessionUserId) ?? null;
}

export function roleConfig(state: State, role?: User["role"]) {
  return state.roles.find((item) => item.name === role);
}

export function can(state: State, module: ModuleKey, action: keyof RoleConfig["permissions"][ModuleKey] = "view") {
  const user = currentUser(state);
  if (!user || user.status !== "Active") return false;
  const config = roleConfig(state, user.role);
  if (!config || config.status !== "Active") return false;
  return config.permissions[module][action];
}

export function navFor(state: State) {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.href === "/follow-ups") {
        const user = currentUser(state);
        return !!user && can(state, "Leads") && user.role !== "Credit Analyst" && user.role !== "Management";
      }
      if (item.href === "/financials") {
        const user = currentUser(state);
        return !!user && can(state, "Financials") && user.role !== "Sales";
      }
      return can(state, item.module);
    }),
  })).filter((group) => group.items.length > 0);
}

export function userName(state: State, id?: string) {
  if (!id) return "Unassigned";
  return state.users.find((user) => user.id === id)?.name ?? "Unknown";
}

export function customerById(state: State, id: string) {
  return state.customers.find((customer) => customer.id === id);
}

export function customerByCode(state: State, code: string) {
  return state.customers.find((customer) => customer.code === code);
}

export function primaryContact(customer?: Customer) {
  if (!customer) return undefined;
  return customer.contacts.find((contact) => contact.type === "Owner") ?? customer.contacts[0];
}
