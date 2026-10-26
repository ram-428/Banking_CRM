import type { Customer } from "./types";

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function possibleDuplicates(
  customers: Customer[],
  draft: { name: string; tradeLicense: string; email: string; mobile: string },
) {
  const name = norm(draft.name);
  return customers.filter((customer) => {
    const license =
      draft.tradeLicense.trim() &&
      customer.tradeLicense.toLowerCase() === draft.tradeLicense.trim().toLowerCase();
    const companyName = norm(customer.name);
    const nameHit = name.length > 4 && (companyName === name || companyName.includes(name) || name.includes(companyName));
    const contactHit = customer.contacts.some((contact) => {
      const email = draft.email.trim().toLowerCase();
      const mobile = draft.mobile.replace(/\s+/g, "");
      return (email && contact.email.toLowerCase() === email) || (mobile && contact.mobile.replace(/\s+/g, "") === mobile);
    });
    return Boolean(license || nameHit || contactHit);
  });
}
