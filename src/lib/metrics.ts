import { STAGES } from "./constants";
import type { AppStatus, Application, BankSubmission, ChecklistItem, Customer, ProfileSnapshot, Stage, State } from "./types";

const BLOCKING: ChecklistItem["stage"][] = ["collection", "financial review", "credit review"];

export function progress(items: ChecklistItem[]) {
  const required = items.filter((item) => item.requiredNow && BLOCKING.includes(item.stage));
  const done = required.filter((item) => item.status === "Approved");
  return { required: required.length, done: done.length };
}

export function stageIndex(stage: Stage) {
  return STAGES.indexOf(stage);
}

export function isOverdue(app: Application, today = new Date()) {
  if (!app.expectedCompletion) return false;
  if (["Closed", "Rejected", "Withdrawn"].includes(app.status)) return false;
  const due = new Date(app.expectedCompletion);
  return due.getTime() < today.getTime() && app.stageStatus !== "Completed";
}

export function nextStep(app: Application, code?: string) {
  switch (app.currentStage) {
    case "Document Collection":
      return { label: "Review checklist", href: `/applications/${app.id}/checklist` };
    case "Document Verification":
      return { label: "Open verification", href: `/verification?application=${app.id}` };
    case "Financial Profiling":
      return { label: "Open financial profile", href: code ? `/financials/${code}` : "/financials" };
    case "Credit Review":
      return { label: "Record credit decision", href: `/applications/${app.id}/credit` };
    case "Bank Submission":
    case "Bank Processing":
      return { label: "Update bank submissions", href: `/applications/${app.id}/banks` };
    case "Agreement":
      return { label: "Track agreement", href: `/applications/${app.id}/agreement` };
    case "Loan Delivery":
      return { label: "Record disbursement", href: `/applications/${app.id}/delivery` };
    case "Closure":
      return { label: "Close application", href: `/applications/${app.id}/close` };
    default:
      return { label: "Open application", href: `/applications/${app.id}` };
  }
}

export function submissionBlockers(state: State, applicationId: string) {
  const items = state.checklist.filter(
    (item) => item.applicationId === applicationId && item.requiredNow && BLOCKING.includes(item.stage) && item.status !== "Approved",
  );
  const eligible = state.reviews.some((review) => review.applicationId === applicationId && review.decision === "Eligible");
  const reasons: string[] = [];
  if (items.length) reasons.push(`${items.length} required document${items.length === 1 ? "" : "s"} still need approval.`);
  if (!eligible) reasons.push("Credit review is not marked Eligible.");
  return reasons;
}

export function deliveredTotal(state: State, applicationId: string) {
  return state.deliveries.filter((row) => row.applicationId === applicationId).reduce((sum, row) => sum + row.amount, 0);
}

export function latestDeliveryDate(state: State, applicationId: string) {
  const dates = state.deliveries.filter((row) => row.applicationId === applicationId).map((row) => row.date);
  return dates.sort().at(-1);
}

const BANK_OPEN = new Set(["Draft", "Submitted", "Under Bank Review", "Additional Documents Required"]);

export function rollUpStatus(current: AppStatus, submissions: Pick<BankSubmission, "status">[], hasDelivery: boolean): AppStatus {
  if (current === "Closed") return "Closed";
  if (hasDelivery) return "Disbursed";
  if (submissions.length === 0) return current;
  const statuses = submissions.map((item) => item.status);
  const open = statuses.filter((item) => BANK_OPEN.has(item));
  const approved = statuses.filter((item) => item === "Approved").length;
  const rejected = statuses.filter((item) => item === "Rejected").length;
  if (open.length === 0 && approved > 0) return "Approved";
  if (open.length === 0 && rejected > 0) return "Rejected";
  if (open.length === 0 && statuses.every((item) => item === "Withdrawn")) return "Withdrawn";
  if (approved > 0) return "Bank Processing";
  if (statuses.every((item) => item === "Draft")) return current;
  if (open.some((item) => item === "Under Bank Review" || item === "Additional Documents Required")) return "Bank Processing";
  return "Submitted to Bank";
}

export function applyBankRollup(app: Application, submissions: Pick<BankSubmission, "status">[], hasDelivery: boolean): Partial<Application> {
  const status = rollUpStatus(app.status, submissions, hasDelivery);
  const patch: Partial<Application> = { status };
  if ((status === "Submitted to Bank" || status === "Bank Processing") && stageIndex(app.currentStage) < stageIndex("Bank Processing")) {
    patch.currentStage = "Bank Processing";
    patch.stageStatus = "In Progress";
  }
  if (status === "Approved" && stageIndex(app.currentStage) < stageIndex("Agreement")) {
    patch.currentStage = "Agreement";
    patch.stageStatus = "In Progress";
  }
  if (status === "Disbursed") {
    patch.currentStage = "Loan Delivery";
    patch.stageStatus = "In Progress";
  }
  if (status === "Rejected" || status === "Withdrawn") patch.stageStatus = "Completed";
  return patch;
}

export function captureSnapshot(customer: Customer, capturedAt: string): ProfileSnapshot {
  const vatSummary = customer.vatReturns.length
    ? customer.vatReturns.map((row) => `${row.from || "Open"} to ${row.to || "Open"}`).join(", ")
    : "None recorded";
  const exposureSummary = customer.exposures.length
    ? customer.exposures.map((row) => `${row.bank} ${row.facility}`).join(", ")
    : "None recorded";
  const auditYears = customer.audits.map((row) => row.year).filter(Boolean).join(", ") || "None recorded";
  return {
    salesTurnover: customer.salesTurnover,
    bankTurnover: customer.bankTurnover,
    posTurnover: customer.posTurnover,
    avgBalance6: customer.avgBalance6,
    avgBalance12: customer.avgBalance12,
    employees: customer.employees,
    chequeBounce: customer.chequeBounce,
    bounceCount: customer.bounces.length,
    auditAvailable: customer.auditAvailable,
    auditYears,
    vatSummary,
    exposureSummary,
    profileStatus: customer.profileStatus,
    capturedAt,
  };
}

export function profileSections(customer: {
  legalType: string;
  shareholders: unknown[];
  moa: string;
  banks: unknown[];
  salesTurnover?: number;
  vatReturns: unknown[];
  auditAvailable: string;
  exposures: unknown[];
  statement?: { status: string };
}) {
  const sections = [
    { name: "Company", ready: Boolean(customer.legalType) },
    { name: "Shareholders", ready: customer.shareholders.length > 0 },
    { name: "Compliance", ready: customer.moa === "Yes" },
    { name: "Banking", ready: customer.banks.length > 0 },
    { name: "Turnover", ready: customer.salesTurnover != null },
    { name: "VAT", ready: customer.vatReturns.length > 0 },
    { name: "Audit", ready: customer.auditAvailable === "Yes" || customer.auditAvailable === "No" },
    { name: "Exposure", ready: true },
    { name: "Statements", ready: customer.statement?.status === "Finalized" },
  ];
  return { sections, ready: sections.filter((section) => section.ready).length, total: sections.length };
}
