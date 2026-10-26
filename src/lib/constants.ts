import type { ModuleKey, PermFlags, Stage, UserRole } from "./types";

export const STAGES: Stage[] = [
  "Lead Qualification",
  "Lending Application",
  "Document Collection",
  "Document Verification",
  "Financial Profiling",
  "Credit Review",
  "Bank Submission",
  "Bank Processing",
  "Agreement",
  "Loan Delivery",
  "Closure",
];

export const BANKS = [
  "Emirates NBD",
  "First Abu Dhabi Bank",
  "Abu Dhabi Commercial Bank",
  "Dubai Islamic Bank",
  "Mashreq",
  "RAKBANK",
  "Commercial Bank of Dubai",
  "Other",
];

export const LOAN_TYPES = [
  "Business Loan",
  "Working Capital Loan",
  "Term Loan",
  "Overdraft Facility",
  "Loan Against Property",
  "Other",
];

export const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

export const LEGAL_TYPES = ["LLC", "Sole Establishment", "Free Zone Company", "Civil Company", "Branch"];

export const LOBS = [
  "Trading",
  "Contracting",
  "Food and beverage",
  "Logistics",
  "Facilities management",
  "Manufacturing",
  "Professional services",
];

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "In Discussion",
  "Qualified",
  "On Hold",
  "Converted",
  "Lost",
] as const;

export const APP_STATUSES = [
  "Draft",
  "Document Collection",
  "Document Verification",
  "Credit Review",
  "Ready for Bank Submission",
  "Submitted to Bank",
  "Bank Processing",
  "Approved",
  "Rejected",
  "Disbursed",
  "Closed",
  "On Hold",
  "Withdrawn",
] as const;

export const REJECTION_REASONS = [
  "Incorrect",
  "Expired",
  "Poor quality",
  "Missing pages",
  "Company mismatch",
  "Incomplete statement",
  "Invalid period",
  "Unsupported format",
  "Other",
];

export const MODULES: ModuleKey[] = [
  "Leads",
  "Applications",
  "Verification",
  "Financials",
  "Credit",
  "Banks",
  "Tasks",
  "Users",
  "Documents",
  "Audit",
];

export const PERM_KEYS = ["view", "create", "edit", "delete", "approve", "export"] as const;

export function flags(view: boolean, create = false, edit = false, del = false, approve = false, exp = false): PermFlags {
  return { view, create, edit, delete: del, approve, export: exp };
}

export function allFlags(): PermFlags {
  return flags(true, true, true, true, true, true);
}

export function noFlags(): PermFlags {
  return flags(false);
}

export const STAGE_HREF: Record<Stage, (appId: string, customerCode?: string) => string> = {
  "Lead Qualification": (_id, code) => (code ? `/customers/${code}` : "/leads"),
  "Lending Application": (id) => `/applications/${id}`,
  "Document Collection": (id) => `/applications/${id}/checklist`,
  "Document Verification": (id) => `/verification?application=${id}`,
  "Financial Profiling": (_id, code) => (code ? `/financials/${code}` : "/financials"),
  "Credit Review": (id) => `/applications/${id}/credit`,
  "Bank Submission": (id) => `/applications/${id}/banks`,
  "Bank Processing": (id) => `/applications/${id}/banks`,
  Agreement: (id) => `/applications/${id}/agreement`,
  "Loan Delivery": (id) => `/applications/${id}/delivery`,
  Closure: (id) => `/applications/${id}/close`,
};

export const NAV: { section: string; items: { href: string; label: string; module: ModuleKey }[] }[] = [
  {
    section: "Work",
    items: [
      { href: "/dashboard", label: "Dashboard", module: "Applications" },
      { href: "/tasks", label: "My tasks", module: "Tasks" },
      { href: "/follow-ups", label: "Follow-ups", module: "Leads" },
    ],
  },
  {
    section: "Pipeline",
    items: [
      { href: "/leads", label: "Leads", module: "Leads" },
      { href: "/applications", label: "Applications", module: "Applications" },
    ],
  },
  {
    section: "Review",
    items: [
      { href: "/verification", label: "Verification", module: "Verification" },
      { href: "/financials", label: "Financial profiles", module: "Financials" },
    ],
  },
  {
    section: "Control",
    items: [
      { href: "/users", label: "Users", module: "Users" },
      { href: "/roles", label: "Roles", module: "Users" },
      { href: "/documents", label: "Document master", module: "Documents" },
      { href: "/audit", label: "Audit history", module: "Audit" },
    ],
  },
];

export const ROLE_HOME: Record<UserRole, string> = {
  Admin: "/dashboard",
  Sales: "/dashboard",
  "Credit Analyst": "/dashboard",
  Operations: "/dashboard",
  Management: "/dashboard",
};
