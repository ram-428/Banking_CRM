import type { ModuleKey, PermFlags, RuleStage, Stage, UserRole } from "./types";

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

export const COUNTRIES = ["United Arab Emirates", "Saudi Arabia", "Oman", "Qatar", "Bahrain", "Kuwait", "India", "Other"];

export const LEAD_SOURCES = ["Referral", "Walk-in", "Website", "Partner", "Existing customer", "Campaign", "Other"];

export const NATIONALITIES = ["United Arab Emirates", "India", "Pakistan", "Egypt", "Philippines", "United Kingdom", "Jordan", "Other"];

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "In Discussion",
  "Qualified",
  "On Hold",
  "Converted",
  "Lost",
] as const;

export const SUBMISSION_STATUSES = [
  "Draft",
  "Submitted",
  "Under Bank Review",
  "Additional Documents Required",
  "Approved",
  "Rejected",
  "Withdrawn",
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

export const FILE_TYPES = ["pdf", "jpg", "png", "docx", "xlsx"];

export const REMINDER_DAYS = [7, 14, 30, 60, 90];

export const RULE_STAGES: RuleStage[] = ["collection", "financial review", "credit review", "bank approval", "agreement"];

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
    section: "",
    items: [{ href: "/dashboard", label: "Dashboard", module: "Applications" }],
  },
  {
    section: "Customer and Lead Management",
    items: [
      { href: "/leads", label: "Lead list", module: "Leads" },
      { href: "/customers", label: "Customer profiles", module: "Leads" },
    ],
  },
  {
    section: "Lending Application Management",
    items: [
      { href: "/applications", label: "Application list", module: "Applications" },
      { href: "/bank-submissions", label: "Bank submissions", module: "Banks" },
      { href: "/bank-responses", label: "Bank responses", module: "Banks" },
      { href: "/disbursements", label: "Disbursements", module: "Applications" },
    ],
  },
  {
    section: "Document Master and Checklist Configuration",
    items: [
      { href: "/documents", label: "Document categories", module: "Documents" },
      { href: "/documents?tab=documents", label: "Document master", module: "Documents" },
      { href: "/documents?tab=rules", label: "Checklist configuration", module: "Documents" },
      { href: "/verification", label: "Verification queue", module: "Verification" },
      { href: "/ai-results", label: "AI results", module: "Verification" },
      { href: "/versions", label: "Version history", module: "Verification" },
    ],
  },
  {
    section: "Financial Information",
    items: [
      { href: "/financials", label: "Financial profiles", module: "Financials" },
      { href: "/statements", label: "Bank statement analysis", module: "Financials" },
      { href: "/vat-returns", label: "VAT returns", module: "Financials" },
      { href: "/audit-reports", label: "Audit reports", module: "Financials" },
      { href: "/credit-reviews", label: "Credit review", module: "Credit" },
    ],
  },
  {
    section: "Workflow and Tasks",
    items: [
      { href: "/workflow", label: "Workflow dashboard", module: "Applications" },
      { href: "/tasks", label: "My tasks", module: "Tasks" },
      { href: "/task-assignment", label: "Task assignment", module: "Tasks" },
      { href: "/follow-ups", label: "Customer follow-ups", module: "Leads" },
    ],
  },
  {
    section: "Agreements and Closure",
    items: [
      { href: "/agreements", label: "Agreement tracking", module: "Banks" },
      { href: "/closures", label: "Application closure", module: "Applications" },
    ],
  },
  {
    section: "Administration",
    items: [
      { href: "/users", label: "User list", module: "Users" },
      { href: "/roles", label: "Role permissions", module: "Users" },
      { href: "/audit", label: "Activity log", module: "Audit" },
    ],
  },
  {
    section: "",
    items: [{ href: "/customer", label: "Customer", module: "Applications" }],
  },
];

export const ROLE_HOME: Record<UserRole, string> = {
  Admin: "/dashboard",
  Sales: "/dashboard",
  "Credit Analyst": "/dashboard",
  Operations: "/dashboard",
  Management: "/dashboard",
};
