import { STAGES } from "./constants";
import type { Application, ChecklistItem, Stage, State } from "./types";

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
