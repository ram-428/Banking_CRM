import { MODULES, noFlags } from "./constants";
import { uid } from "./format";
import { applyBankRollup, captureSnapshot } from "./metrics";
import { isTerminal, mandatoryApproved } from "./request-status";
import type {
  RoleConfig,
  Agreement,
  Application,
  BankSubmission,
  ChecklistItem,
  Closure,
  CreditReview,
  Customer,
  Delivery,
  DocVersion,
  ExtractionRecord,
  FollowUp,
  LoanDeliveryRecord,
  ServiceActivity,
  ServiceDefinition,
  ServiceInstance,
  ServiceRequestRecord,
  State,
  Task,
  TurnoverSource,
  User,
} from "./types";

function withAudit(
  state: State,
  actorId: string,
  action: string,
  module: string,
  record: string,
  extra?: { detail?: string; previous?: string; next?: string },
): State {
  return {
    ...state,
    audit: [
      {
        id: uid("aud"),
        at: new Date().toISOString(),
        actorId,
        action,
        module,
        record,
        ...extra,
      },
      ...state.audit,
    ],
  };
}

function notice(state: State, title: string, detail: string, href: string, userId?: string): State {
  const duplicate = state.notices.some((item) => !item.read && item.title === title && item.href === href && item.userId === userId);
  if (duplicate) return state;
  return {
    ...state,
    notices: [{ id: uid("nt"), title, detail, href, read: false, at: new Date().toISOString(), userId }, ...state.notices],
  };
}

export function login(state: State, email: string, password: string): { state: State; error?: string } {
  const user = state.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) return { state, error: "Email or password does not match." };
  if (user.status !== "Active") return { state, error: "This account is inactive. Ask an administrator to restore access." };
  return { state: { ...state, sessionUserId: user.id }, error: undefined };
}

export function conditionMet(customer: Customer, rule: State["rules"][number]) {
  if (!rule.condition) return false;
  if (rule.condition.field === "moaAmendments") return customer.moaAmendments > Number(rule.condition.value);
  if (rule.condition.field === "exposures") return customer.exposures.length > Number(rule.condition.value);
  if (rule.condition.field === "chequeBounce") return customer.chequeBounce === rule.condition.value;
  return false;
}

export type LeadInput = {
  name: string;
  legalType: string;
  tradeLicense: string;
  startDate?: string;
  lob: string;
  activity?: string;
  website?: string;
  employees?: number;
  relationship: "Main" | "Subsidiary";
  parentId?: string;
  country: string;
  emirate: string;
  address: string;
  tenancy: "Yes" | "No";
  contactName: string;
  designation?: string;
  contactType: "Owner" | "Signatory" | "Other";
  mobile: string;
  email: string;
  alternate?: string;
  nationality?: string;
  service: string;
  loanType?: string;
  requestedAmount?: number;
  preferredBank?: string;
  purpose?: string;
  expectedDate?: string;
  leadSource?: string;
  channel?: string;
  assignedTo: string;
  remarks?: string;
  extraContacts?: {
    name: string;
    designation?: string;
    type: "Owner" | "Signatory" | "Other";
    mobile: string;
    email: string;
    alternate?: string;
    nationality?: string;
  }[];
};

export function createLead(state: State, input: LeadInput, actor: User): { state: State; code: string } {
  const n = state.counters.customer + 1;
  const code = `C-${n}`;
  const id = uid("cus");
  const contactId = uid("ct");
  const now = new Date().toISOString();
  const customer: Customer = {
    id,
    code,
    name: input.name.trim(),
    legalType: input.legalType,
    tradeLicense: input.tradeLicense.trim(),
    startDate: input.startDate,
    lob: input.lob,
    activity: input.activity,
    website: input.website,
    employees: input.employees,
    relationship: input.relationship,
    parentId: input.relationship === "Subsidiary" ? input.parentId : undefined,
    country: input.country,
    emirate: input.emirate,
    address: input.address,
    tenancy: input.tenancy,
    moa: "No",
    moaAmendments: 0,
    amendmentDates: [],
    vatCertificate: "No",
    corporateCertificate: "No",
    auditAvailable: "No",
    chequeBounce: "No",
    contacts: [
      {
        id: contactId,
        name: input.contactName.trim(),
        designation: input.designation,
        type: input.contactType,
        mobile: input.mobile.trim(),
        email: input.email.trim(),
        alternate: input.alternate,
        nationality: input.nationality,
      },
      ...(input.extraContacts ?? [])
        .filter((item) => item.name.trim())
        .map((item) => ({ ...item, id: uid("ct"), name: item.name.trim(), mobile: item.mobile.trim(), email: item.email.trim() })),
    ],
    shareholders: [],
    banks: input.preferredBank ? [{ id: uid("br"), bank: input.preferredBank }] : [],
    exposures: [],
    vatReturns: [],
    audits: [],
    bounces: [],
    leadStatus: "New",
    leadSource: input.leadSource,
    channel: input.channel,
    service: input.service,
    loanType: input.loanType,
    requestedAmount: input.requestedAmount,
    preferredBank: input.preferredBank,
    purpose: input.purpose,
    expectedDate: input.expectedDate,
    remarks: input.remarks,
    assignedTo: input.assignedTo,
    folderRef: `vrw-private/${code}`,
    profileStatus: "Draft",
    createdAt: now,
    updatedAt: now,
    updatedBy: actor.id,
  };
  let next = withAudit(
    {
      ...state,
      counters: { ...state.counters, customer: n },
      customers: [customer, ...state.customers],
    },
    actor.id,
    "Create",
    "Leads",
    `${code} · ${customer.name}`,
    { detail: "Customer code and private folder created." },
  );
  next = notice(next, "Lead saved", `${customer.name} is now ${code}.`, `/customers/${code}`);
  return { state: next, code };
}

const SOURCES: TurnoverSource[] = ["Manual", "AI Extracted", "Reviewed Document"];

export function validateCustomerRecords(customer: Customer): string | undefined {
  for (const row of customer.turnovers ?? []) {
    if (!row.from || !row.to) return "Reporting period from and to are required for turnover.";
    if (row.to < row.from) return "The turnover period end must be on or after the start.";
    if ([row.sales, row.pos, row.bank].some((amount) => Number.isNaN(amount) || amount < 0)) return "Turnover amounts must be zero or greater.";
    if (!SOURCES.includes(row.source)) return "Turnover source must be Manual, AI Extracted, or Reviewed Document.";
  }
  for (const row of customer.averageBalances ?? []) {
    if (!row.bank || !row.from || !row.to) return "Bank name and both period dates are required for an average balance.";
    if (row.bank === "Other" && !row.otherBank?.trim()) return "Other bank name is required.";
    if (row.to < row.from) return "The average balance period end must be on or after the start.";
    if (Number.isNaN(row.average) || row.average < 0) return "Average balance must be zero or greater.";
  }
  for (const row of customer.bounces) {
    if (!row.date && !row.amount && !row.bank) continue;
    if (!row.bank) return "Bank name is required for a cheque return.";
    if (row.bank === "Other" && !row.otherBank?.trim()) return "Other bank name is required for a cheque return.";
    if (!(row.amount > 0)) return "Cheque amount must be greater than zero.";
    if (row.bounceCount == null || !Number.isInteger(row.bounceCount) || row.bounceCount < 0) return "Bounce count must be a whole number of zero or more.";
  }
  return undefined;
}

export function updateCustomer(state: State, id: string, patch: Partial<Customer>, actor: User, detail: string): State {
  const current = state.customers.find((item) => item.id === id);
  if (!current) return state;
  const nextCustomer = { ...current, ...patch, id: current.id, code: current.code, updatedAt: new Date().toISOString(), updatedBy: actor.id };
  if (validateCustomerRecords(nextCustomer)) return state;
  return withAudit(
    { ...state, customers: state.customers.map((item) => (item.id === id ? nextCustomer : item)) },
    actor.id,
    "Update",
    "Customers",
    `${current.code} · ${current.name}`,
    { detail },
  );
}

export type ApplicationInput = {
  customerId: string;
  ownerContactId: string;
  assignedTo: string;
  channel?: string;
  loanType: string;
  amount: number;
  purpose: string;
  preferredBanks: string[];
  tenureMonths?: number;
  financingDate?: string;
  remarks?: string;
};

export function createApplication(state: State, input: ApplicationInput, actor: User): { state: State; id: string } {
  const customer = state.customers.find((item) => item.id === input.customerId);
  if (!customer) return { state, id: "" };
  const n = state.counters.application + 1;
  const id = uid("app");
  const now = new Date().toISOString();
  const number = `LEND-${String(n).padStart(6, "0")}`;
  const application: Application = {
    id,
    number,
    customerId: customer.id,
    ownerContactId: input.ownerContactId,
    assignedTo: input.assignedTo,
    channel: input.channel,
    date: now.slice(0, 10),
    service: "Lending Assistance",
    loanType: input.loanType,
    amount: input.amount,
    purpose: input.purpose.trim(),
    preferredBanks: input.preferredBanks,
    tenureMonths: input.tenureMonths,
    financingDate: input.financingDate,
    remarks: input.remarks,
    snapshot: captureSnapshot(customer, now),
    status: "Document Collection",
    currentStage: "Document Collection",
    stageStatus: "In Progress",
    pendingWith: "Customer",
    pendingReason: "Checklist generated. Portal invitation is the next step.",
    stageStarted: now,
    snapshotLabel: `Profile snapshot ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
    createdAt: now,
    updatedAt: now,
    updatedBy: actor.id,
  };
  const checklist: ChecklistItem[] = state.rules
    .filter((rule) => rule.service === "Lending Assistance" && rule.status === "Active")
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((rule) => {
      const master = state.documents.find((item) => item.code === rule.documentCode && item.status === "Active");
      const category = state.categories.find((item) => item.id === master?.categoryId);
      const requiredNow = rule.requirement === "Mandatory" || (rule.requirement === "Conditional" && conditionMet(customer, rule));
      return {
        id: uid("chk"),
        applicationId: id,
        documentCode: rule.documentCode,
        name: master?.name ?? rule.documentCode,
        category: category?.name ?? "General",
        requirement: rule.requirement,
        stage: rule.stage,
        status: "Pending Upload" as const,
        customerUpload: rule.customerUpload,
        multiple: master?.multiple ?? false,
        expiryApplicable: master?.expiryApplicable ?? false,
        aiEnabled: master?.ai ?? false,
        requiredNow,
      };
    });
  let next: State = {
    ...state,
    counters: { ...state.counters, application: n },
    applications: [application, ...state.applications],
    checklist: [...checklist, ...state.checklist],
    customers: state.customers.map((item) =>
      item.id === customer.id ? { ...item, leadStatus: item.leadStatus === "Lost" ? item.leadStatus : "Converted", updatedAt: now, updatedBy: actor.id } : item,
    ),
  };
  next = withAudit(next, actor.id, "Create", "Applications", number, { detail: `Checklist copied for ${customer.name}. Master changes will not alter this list.` });
  return { state: notice(next, "Application opened", `${number} checklist is ready.`, `/applications/${id}`), id };
}

export function sendInvitation(
  state: State,
  input: { applicationId: string; contactId: string; email: string; expiresAt: string; template: string; message?: string },
  actor: User,
): State {
  const app = state.applications.find((item) => item.id === input.applicationId);
  const customer = state.customers.find((item) => item.id === app?.customerId);
  const contact = customer?.contacts.find((item) => item.id === input.contactId);
  if (!app || !contact) return state;
  const invitation = {
    id: uid("inv"),
    applicationId: app.id,
    contactId: contact.id,
    email: input.email.trim(),
    mobile: contact.mobile,
    expiresAt: input.expiresAt,
    template: input.template,
    message: input.message,
    status: "Sent" as const,
    sentAt: new Date().toISOString(),
    sentBy: actor.id,
  };
  return notice(
    withAudit(
      { ...state, invitations: [invitation, ...state.invitations] },
      actor.id,
      "Invite",
      "Portal",
      `${app.number} · ${contact.name}`,
      { detail: `Secure link sent to ${invitation.email}.` },
    ),
    "Invitation sent",
    `${contact.name} can upload documents for ${app.number}.`,
    `/applications/${app.id}/invite`,
  );
}

export function revokeInvitation(state: State, id: string, actor: User): State {
  const current = state.invitations.find((item) => item.id === id);
  if (!current) return state;
  return withAudit(
    { ...state, invitations: state.invitations.map((item) => (item.id === id ? { ...item, status: "Revoked" } : item)) },
    actor.id,
    "Revoke",
    "Portal",
    current.email,
    { previous: current.status, next: "Revoked" },
  );
}

export function portalLogin(state: State, email: string): { state: State; error?: string } {
  const normalized = email.trim().toLowerCase();
  const invite = state.invitations.find((item) => item.email.toLowerCase() === normalized && item.status !== "Revoked");
  if (!invite) return { state, error: "No open invitation matches this email." };
  if (invite.status === "Expired" || new Date(invite.expiresAt).getTime() < Date.now()) {
    return { state, error: "This invitation has expired. Ask your relationship manager to send a new link." };
  }
  return {
    state: {
      ...state,
      portalEmail: normalized,
      invitations: state.invitations.map((item) => (item.id === invite.id && item.status === "Sent" ? { ...item, status: "Opened" } : item)),
    },
  };
}

export function uploadDocument(
  state: State,
  input: {
    checklistItemId: string;
    fileName: string;
    uploadedBy: string;
    issueDate?: string;
    expiryDate?: string;
    periodFrom?: string;
    periodTo?: string;
    reference?: string;
    remarks?: string;
  },
): { state: State; error?: string; versionId?: string } {
  const item = state.checklist.find((row) => row.id === input.checklistItemId);
  if (!item) return { state, error: "This checklist item is no longer on the application." };
  const master = state.documents.find((doc) => doc.code === item.documentCode);
  if (master && input.fileName) {
    const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!master.fileTypes.includes(ext)) return { state, error: `Use one of these types: ${master.fileTypes.join(", ")}.` };
  }
  const existing = state.versions.filter((version) => version.checklistItemId === item.id);
  if (item.documentCode === "DOC-BS" && input.periodFrom && input.periodTo) {
    const overlap = existing.some((version) => version.periodFrom && version.periodTo && input.periodFrom! <= version.periodTo && input.periodTo! >= version.periodFrom);
    if (overlap) return { state, error: "That statement period overlaps a version already on the file." };
  }
  const version: DocVersion = {
    id: uid("ver"),
    checklistItemId: item.id,
    applicationId: item.applicationId,
    version: existing.length + 1,
    fileName: input.fileName,
    uploadedBy: input.uploadedBy,
    uploadedAt: new Date().toISOString(),
    status: "Awaiting Review",
    issueDate: input.issueDate,
    expiryDate: input.expiryDate,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    reference: input.reference,
    remarks: input.remarks,
    ai: item.aiEnabled
      ? {
          documentType: item.name,
          companyName: "Pending extraction",
          documentNumber: input.reference || "Not read",
          issueDate: input.issueDate || "",
          expiryDate: input.expiryDate || "",
          match: "Match",
          findings: ["Extraction is queued. A reviewer still has to approve this version."],
          confidence: 0.62,
          processing: "Flagged",
        }
      : undefined,
  };
  const app = state.applications.find((row) => row.id === item.applicationId);
  let next: State = {
    ...state,
    versions: [version, ...state.versions],
    checklist: state.checklist.map((row) =>
      row.id === item.id ? { ...row, status: "Awaiting Review", rejectionReason: undefined, instructions: undefined } : row,
    ),
  };
  next = withAudit(next, state.sessionUserId ?? "portal", "Upload", "Documents", `${app?.number ?? item.applicationId} · ${item.name} v${version.version}`, {
    detail: `${input.fileName} stored in the private folder. Status is Awaiting Review, not Approved.`,
  });
  return { state: notice(next, "Document uploaded", `${item.name} is waiting for review.`, `/verification/${version.id}`), versionId: version.id };
}

export function reviewDocument(
  state: State,
  input: {
    versionId: string;
    decision: "Approved" | "Rejected";
    rejectionReason?: string;
    comments?: string;
    issueDate?: string;
    expiryDate?: string;
    exceptionReason?: string;
    notify: boolean;
  },
  actor: User,
): { state: State; error?: string } {
  const version = state.versions.find((item) => item.id === input.versionId);
  if (!version) return { state, error: "Version not found." };
  const expired = version.expiryDate && new Date(version.expiryDate) < new Date();
  if (input.decision === "Approved" && expired && !input.exceptionReason?.trim()) {
    return { state, error: "This document is expired. Approval needs an audited exception reason." };
  }
  if (input.decision === "Rejected" && (!input.rejectionReason || !input.comments?.trim())) {
    return { state, error: "A rejection needs a reason and correction instructions." };
  }
  const item = state.checklist.find((row) => row.id === version.checklistItemId);
  const now = new Date().toISOString();
  let next: State = {
    ...state,
    versions: state.versions.map((row) =>
      row.id === version.id
        ? {
            ...row,
            status: input.decision === "Approved" ? "Approved" : "Rejected",
            reviewerId: actor.id,
            reviewedAt: now,
            rejectionReason: input.rejectionReason,
            comments: input.comments,
            issueDate: input.issueDate || row.issueDate,
            expiryDate: input.expiryDate || row.expiryDate,
            exceptionReason: input.exceptionReason,
          }
        : row,
    ),
    checklist: state.checklist.map((row) =>
      row.id === version.checklistItemId
        ? {
            ...row,
            status: input.decision === "Approved" ? "Approved" : "Rejected",
            rejectionReason: input.decision === "Rejected" ? input.rejectionReason : undefined,
            instructions: input.decision === "Rejected" ? input.comments : undefined,
          }
        : row,
    ),
  };
  const app = state.applications.find((row) => row.id === version.applicationId);
  next = withAudit(next, actor.id, input.decision === "Approved" ? "Approve" : "Reject", "Verification", `${app?.number ?? ""} · ${item?.name ?? "Document"} v${version.version}`, {
    previous: version.status,
    next: input.decision,
    detail: input.exceptionReason || input.comments,
  });
  if (input.notify && input.decision === "Rejected") {
    next = notice(next, "Resubmission requested", `${item?.name ?? "A document"} was rejected.`, `/applications/${version.applicationId}/checklist`);
  }
  return { state: next };
}

export function saveCredit(
  state: State,
  input: { applicationId: string; decision: CreditReview["decision"]; notes: string; conditions?: string },
  actor: User,
): State {
  const app = state.applications.find((item) => item.id === input.applicationId);
  if (!app) return state;
  const review: CreditReview = {
    id: uid("cr"),
    applicationId: app.id,
    profileLabel: app.snapshotLabel,
    decision: input.decision,
    notes: input.notes.trim(),
    conditions: input.conditions,
    reviewerId: actor.id,
    reviewedAt: new Date().toISOString(),
  };
  let status = app.status;
  let stage = app.currentStage;
  let stageStatus = app.stageStatus;
  let pendingWith = app.pendingWith;
  let pendingReason = app.pendingReason;
  if (input.decision === "Eligible") {
    status = "Ready for Bank Submission";
    stage = "Bank Submission";
    stageStatus = "In Progress";
    pendingWith = "Operations";
    pendingReason = "Credit marked the file eligible.";
  } else if (input.decision === "Not Eligible") {
    status = "Rejected";
    stage = "Credit Review";
    stageStatus = "Completed";
    pendingWith = undefined;
    pendingReason = input.notes;
  } else if (input.decision === "More Information Required") {
    status = "Credit Review";
    stage = "Financial Profiling";
    stageStatus = "On Hold";
    pendingWith = "Sales";
    pendingReason = input.conditions || input.notes;
  } else {
    status = "On Hold";
    stageStatus = "On Hold";
    pendingWith = "Credit";
    pendingReason = input.notes;
  }
  const next = {
    ...state,
    reviews: [review, ...state.reviews],
    applications: state.applications.map((item) =>
      item.id === app.id
        ? { ...item, status, currentStage: stage, stageStatus, pendingWith, pendingReason, stageStarted: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: actor.id }
        : item,
    ),
  };
  return withAudit(next, actor.id, "Review", "Credit", `${app.number} · ${app.snapshotLabel}`, { next: input.decision, detail: input.notes });
}

export function addSubmission(
  state: State,
  input: Omit<BankSubmission, "id" | "reference" | "status"> & { status?: BankSubmission["status"]; overrideReason?: string },
  actor: User,
  blockers: string[],
): { state: State; error?: string } {
  if (blockers.length && !input.overrideReason?.trim()) {
    return { state, error: blockers.join(" ") };
  }
  const n = state.counters.submission + 1;
  const app = state.applications.find((item) => item.id === input.applicationId);
  const submission: BankSubmission = {
    ...input,
    id: uid("sub"),
    reference: `SUB-${String(n).padStart(6, "0")}`,
    status: input.status ?? "Submitted",
    overrideReason: input.overrideReason,
  };
  const now = new Date().toISOString();
  const submissions = [submission, ...state.submissions.filter((item) => item.applicationId === input.applicationId)];
  const rolled = app ? applyBankRollup(app, submissions, state.deliveries.some((item) => item.applicationId === app.id)) : {};
  let next: State = {
    ...state,
    counters: { ...state.counters, submission: n },
    submissions: [submission, ...state.submissions],
    applications: state.applications.map((item) =>
      item.id === input.applicationId
        ? {
            ...item,
            ...rolled,
            pendingWith: submission.bank,
            pendingReason:
              rolled.status === "Bank Processing"
                ? "Banks are at different stages. The file stays in bank processing until each submission is finished."
                : rolled.status === "Approved"
                  ? "Every open bank has answered, and at least one approval is on file."
                  : `Recorded with ${submission.bank}.`,
            updatedAt: now,
            updatedBy: actor.id,
          }
        : item,
    ),
  };
  next = withAudit(next, actor.id, "Submit", "Banks", `${submission.reference} · ${submission.bank}`, {
    detail: input.overrideReason ? `Override: ${input.overrideReason}` : app?.number,
  });
  return { state: next };
}

export function updateSubmission(state: State, id: string, patch: Partial<BankSubmission>, actor: User): State {
  const current = state.submissions.find((item) => item.id === id);
  if (!current) return state;
  const nextRow = { ...current, ...patch };
  const submissions = state.submissions.map((item) => (item.id === id ? nextRow : item)).filter((item) => item.applicationId === current.applicationId);
  const app = state.applications.find((item) => item.id === current.applicationId);
  const rolled = app ? applyBankRollup(app, submissions, state.deliveries.some((item) => item.applicationId === app.id)) : {};
  let next: State = {
    ...state,
    submissions: state.submissions.map((item) => (item.id === id ? nextRow : item)),
    applications: state.applications.map((item) =>
      item.id === current.applicationId
        ? {
            ...item,
            ...rolled,
            pendingReason:
              rolled.status === "Bank Processing"
                ? "Banks are at different stages. The file stays in bank processing until each submission is finished."
                : rolled.status === "Approved"
                  ? "Every open bank has answered, and at least one approval is on file."
                  : item.pendingReason,
            updatedAt: new Date().toISOString(),
            updatedBy: actor.id,
          }
        : item,
    ),
  };
  if (patch.additionalRequest?.trim()) {
    next = {
      ...next,
      checklist: [
        {
          id: uid("chk"),
          applicationId: current.applicationId,
          documentCode: "BANK-REQ",
          name: `${current.bank}: ${patch.additionalRequest.trim()}`,
          category: "Bank request",
          requirement: "Mandatory",
          stage: "bank approval",
          status: "Pending Upload",
          customerUpload: true,
          multiple: false,
          expiryApplicable: false,
          aiEnabled: false,
          requiredNow: true,
        },
        ...next.checklist,
      ],
    };
  }
  return withAudit(next, actor.id, "Update", "Banks", current.reference, { previous: current.status, next: nextRow.status, detail: patch.additionalRequest });
}

export function saveAgreement(state: State, input: Omit<Agreement, "id">, actor: User): State {
  const agreement: Agreement = { ...input, id: uid("agr") };
  const app = state.applications.find((item) => item.id === input.applicationId);
  let next: State = {
    ...state,
    agreements: [agreement, ...state.agreements],
    applications: state.applications.map((item) =>
      item.id === input.applicationId
        ? { ...item, currentStage: "Agreement", stageStatus: "In Progress", status: item.status === "Closed" ? item.status : "Approved", updatedAt: new Date().toISOString(), updatedBy: actor.id }
        : item,
    ),
  };
  next = withAudit(next, actor.id, "Update", "Agreement", app?.number ?? input.applicationId, { next: agreement.status, detail: agreement.provider });
  return next;
}

export function updateAgreement(state: State, id: string, patch: Partial<Agreement>, actor: User): State {
  const current = state.agreements.find((item) => item.id === id);
  if (!current) return state;
  const nextRow = { ...current, ...patch };
  let next: State = { ...state, agreements: state.agreements.map((item) => (item.id === id ? nextRow : item)) };
  if (patch.status === "Completed") {
    next = {
      ...next,
      applications: next.applications.map((item) =>
        item.id === current.applicationId
          ? { ...item, currentStage: "Loan Delivery", stageStatus: "In Progress", pendingWith: "Operations", pendingReason: "Agreement completed. Delivery can be recorded.", updatedAt: new Date().toISOString(), updatedBy: actor.id }
          : item,
      ),
    };
  }
  return withAudit(next, actor.id, "Sign", "Agreement", current.envelopeId || current.type, { previous: current.status, next: nextRow.status });
}

export function addDelivery(state: State, input: Omit<Delivery, "id" | "recordedBy" | "recordedAt">, actor: User): State {
  const now = new Date().toISOString();
  const delivery: Delivery = { ...input, id: uid("del"), recordedBy: actor.id, recordedAt: now, updatedAt: now, updatedBy: actor.id };
  const app = state.applications.find((item) => item.id === input.applicationId);
  const submissions = state.submissions.filter((item) => item.applicationId === input.applicationId);
  const rolled = app ? applyBankRollup(app, submissions, true) : { status: "Disbursed" as const, currentStage: "Loan Delivery" as const, stageStatus: "In Progress" as const };
  let next: State = {
    ...state,
    deliveries: [delivery, ...state.deliveries],
    applications: state.applications.map((item) =>
      item.id === input.applicationId
        ? { ...item, ...rolled, pendingWith: "Operations", pendingReason: "A disbursement was recorded. Close the file when the outcome is final.", updatedAt: now, updatedBy: actor.id }
        : item,
    ),
  };
  next = withAudit(next, actor.id, "Create", "Delivery", app?.number ?? input.applicationId, { detail: `${input.bank} · AED ${input.amount}` });
  return next;
}

export function closeApplication(state: State, input: Omit<Closure, "id" | "closedBy" | "closedAt">, actor: User): { state: State; error?: string } {
  const existing = state.closures.find((item) => item.applicationId === input.applicationId);
  if (existing) return { state, error: "This application is already closed. History stays on the file." };
  const app = state.applications.find((item) => item.id === input.applicationId);
  if (!app) return { state, error: "Application not found." };
  const closure: Closure = { ...input, id: uid("cls"), closedBy: actor.id, closedAt: new Date().toISOString() };
  let next: State = {
    ...state,
    closures: [closure, ...state.closures],
    applications: state.applications.map((item) =>
      item.id === app.id
        ? { ...item, status: "Closed", currentStage: "Closure", stageStatus: "Completed", pendingWith: undefined, pendingReason: undefined, updatedAt: closure.closedAt, updatedBy: actor.id }
        : item,
    ),
  };
  next = withAudit(next, actor.id, "Close", "Closure", app.number, { previous: app.status, next: closure.outcome, detail: input.remarks });
  return { state: next };
}

export function saveTask(state: State, input: Omit<Task, "id" | "assignedAt"> & { id?: string }, actor: User): State {
  if (input.id) {
    const current = state.tasks.find((item) => item.id === input.id);
    if (!current) return state;
    const nextRow = { ...current, ...input, completedAt: input.status === "Completed" ? new Date().toISOString() : current.completedAt };
    return withAudit(
      { ...state, tasks: state.tasks.map((item) => (item.id === input.id ? nextRow : item)) },
      actor.id,
      "Update",
      "Tasks",
      current.name,
      { previous: `${current.status} · due ${current.due} · ${current.assigneeId}`, next: `${nextRow.status} · due ${nextRow.due} · ${nextRow.assigneeId}` },
    );
  }
  const n = state.counters.task + 1;
  const task: Task = { ...input, id: `task-${n}`, assignedAt: new Date().toISOString().slice(0, 10) };
  return withAudit({ ...state, counters: { ...state.counters, task: n }, tasks: [task, ...state.tasks] }, actor.id, "Create", "Tasks", task.name);
}

export function saveFollowUp(state: State, input: Omit<FollowUp, "id">, actor: User): State {
  const n = state.counters.followUp + 1;
  const row: FollowUp = { ...input, id: `fu-${n}` };
  return withAudit({ ...state, counters: { ...state.counters, followUp: n }, followUps: [row, ...state.followUps] }, actor.id, "Create", "Follow-up", input.purpose);
}

export function saveUser(state: State, input: Omit<User, "id"> & { id?: string }, actor: User): { state: State; error?: string; id?: string } {
  const email = input.email.trim().toLowerCase();
  const clash = state.users.find((user) => user.email.toLowerCase() === email && user.id !== input.id);
  if (clash) return { state, error: "That email is already used by another employee." };
  if (input.id) {
    const next = withAudit(
      { ...state, users: state.users.map((user) => (user.id === input.id ? { ...user, ...input, email } : user)) },
      actor.id,
      "Update",
      "Users",
      input.name,
    );
    return { state: next, id: input.id };
  }
  const id = uid("user");
  const user: User = { ...input, id, email };
  return {
    state: withAudit({ ...state, users: [...state.users, user] }, actor.id, "Create", "Users", user.name),
    id,
  };
}

export function setUserStatus(state: State, id: string, status: User["status"], actor: User): State {
  const user = state.users.find((item) => item.id === id);
  if (!user) return state;
  return withAudit(
    { ...state, users: state.users.map((item) => (item.id === id ? { ...item, status } : item)) },
    actor.id,
    status === "Inactive" ? "Deactivate" : "Update",
    "Users",
    user.name,
    { previous: user.status, next: status },
  );
}

export function resetAccess(state: State, id: string, actor: User): State {
  const user = state.users.find((item) => item.id === id);
  if (!user) return state;
  return notice(
    withAudit(
      { ...state, users: state.users.map((item) => (item.id === id ? { ...item, password: "welcome" } : item)) },
      actor.id,
      "Reset access",
      "Users",
      user.name,
      { detail: "Demo password restored." },
    ),
    "Access reset",
    `${user.name} can sign in with the demo password again.`,
    `/users/${id}`,
  );
}

export function createRole(
  state: State,
  input: { name: string; slug: string; description: string },
  actor: User,
): { state: State; error?: string; id?: string } {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name) return { state, error: "Enter the role name." };
  if (!/^[a-z0-9_]+$/.test(slug)) return { state, error: "Use lowercase letters, numbers, and underscores." };
  if (state.roles.some((item) => item.name.toLowerCase() === name.toLowerCase() || item.id === `role-${slug}`)) {
    return { state, error: "A role with that name or slug already exists." };
  }
  const permissions = Object.fromEntries(MODULES.map((module) => [module, noFlags()])) as RoleConfig["permissions"];
  const role: RoleConfig = {
    id: `role-${slug}`,
    name,
    description: input.description.trim(),
    status: "Active",
    scope: "Own",
    permissions,
  };
  return {
    state: withAudit({ ...state, roles: [...state.roles, role] }, actor.id, "Create", "Roles", name, {
      detail: "New role starts with no permissions.",
    }),
    id: role.id,
  };
}

export function updateRole(state: State, id: string, patch: Partial<State["roles"][number]>, actor: User): State {
  const role = state.roles.find((item) => item.id === id);
  if (!role) return state;
  return withAudit(
    { ...state, roles: state.roles.map((item) => (item.id === id ? { ...item, ...patch } : item)) },
    actor.id,
    "Update",
    "Roles",
    role.name,
    { detail: "Permission change applies to new sessions. Existing checklists are untouched." },
  );
}

export function saveDocument(state: State, input: State["documents"][number], actor: User): State {
  const exists = state.documents.some((item) => item.id === input.id);
  const documents = exists ? state.documents.map((item) => (item.id === input.id ? input : item)) : [...state.documents, input];
  const counters = exists ? state.counters : { ...state.counters, document: state.counters.document + 1 };
  return withAudit({ ...state, documents, counters }, actor.id, exists ? "Update" : "Create", "Documents", input.name, {
    detail: "Master change does not alter checklists already generated.",
  });
}

export function saveCategory(state: State, input: State["categories"][number], actor: User): State {
  const exists = state.categories.some((item) => item.id === input.id);
  const categories = exists ? state.categories.map((item) => (item.id === input.id ? input : item)) : [...state.categories, input];
  return withAudit({ ...state, categories }, actor.id, exists ? "Update" : "Create", "Documents", input.name);
}

export function saveRule(state: State, input: State["rules"][number], actor: User): State {
  const exists = state.rules.some((item) => item.id === input.id);
  const rules = exists ? state.rules.map((item) => (item.id === input.id ? input : item)) : [...state.rules, input];
  return withAudit({ ...state, rules }, actor.id, exists ? "Update" : "Create", "Documents", input.documentCode, {
    detail: "Applies to applications created after this change. Existing checklists stay as they were.",
  });
}

export function markNotice(state: State, id: string): State {
  return { ...state, notices: state.notices.map((item) => (item.id === id ? { ...item, read: true } : item)) };
}

export function correctAi(state: State, versionId: string, companyName: string, actor: User): State {
  return withAudit(
    {
      ...state,
      versions: state.versions.map((item) =>
        item.id === versionId && item.ai ? { ...item, ai: { ...item.ai, companyName, processing: "Flagged" } } : item,
      ),
    },
    actor.id,
    "Correct",
    "AI",
    versionId,
    { detail: `Corrected extracted name to ${companyName}. Approval is unchanged.` },
  );
}

function touchRequest(state: State, requestId: string): State {
  const now = new Date().toISOString();
  return {
    ...state,
    serviceRequests: state.serviceRequests.map((item) => (item.id === requestId ? { ...item, updatedAt: now } : item)),
  };
}

export function saveServiceDefinition(state: State, input: Omit<ServiceDefinition, "id"> & { id?: string }, actor: User): { state: State; error?: string } {
  const name = input.name.trim();
  if (!name) return { state, error: "Service name is required." };
  const clash = state.services.find((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== input.id);
  if (clash) return { state, error: "A service with that name already exists." };
  if (input.documentCodes.length === 0) return { state, error: "Select at least one document for the checklist." };
  if (input.id) {
    const next = withAudit(
      { ...state, services: state.services.map((item) => (item.id === input.id ? { ...item, ...input, name } : item)) },
      actor.id,
      "Update",
      "Service Master",
      name,
    );
    return { state: next };
  }
  const service: ServiceDefinition = { ...input, id: uid("svc"), name };
  return { state: withAudit({ ...state, services: [service, ...state.services] }, actor.id, "Create", "Service Master", name) };
}

function reusableDocument(state: State, customerId: string, code: string) {
  const requestIds = new Set(state.serviceRequests.filter((item) => item.customerId === customerId).map((item) => item.id));
  const linked = state.serviceInstances.find((instance) => requestIds.has(instance.requestId) && instance.checklist.some((item) => item.documentCode === code && item.status === "Approved" && item.fileName));
  if (linked) return linked.checklist.find((item) => item.documentCode === code)?.id;
  const applicationIds = new Set(state.applications.filter((item) => item.customerId === customerId).map((item) => item.id));
  const approved = state.checklist.find((item) => applicationIds.has(item.applicationId) && item.documentCode === code && item.status === "Approved");
  return approved?.id;
}

export function createServiceRequest(
  state: State,
  input: { customerId: string; serviceIds: string[]; assigneeId: string; priority: ServiceRequestRecord["priority"]; remarks?: string; previousRequestId?: string },
  actor: User,
): { state: State; error?: string; id?: string } {
  const customer = state.customers.find((item) => item.id === input.customerId);
  if (!customer || customer.leadStatus === "Lost") return { state, error: "Select an active customer." };
  const unique = [...new Set(input.serviceIds)];
  if (unique.length === 0) return { state, error: "Select at least one active banking service." };
  if (unique.length !== input.serviceIds.length) return { state, error: "The same banking service cannot be selected twice in one request." };
  const chosen = unique.map((id) => state.services.find((item) => item.id === id));
  if (chosen.some((item) => !item || item.status !== "Active")) return { state, error: "Every selected service must be active." };
  const assignee = state.users.find((item) => item.id === input.assigneeId && item.status === "Active");
  if (!assignee) return { state, error: "Assigned employee must be an active user." };
  const n = (state.counters.request ?? 0) + 1;
  const now = new Date().toISOString();
  const request: ServiceRequestRecord = {
    id: `req-${n}`,
    number: `REQ-${String(n).padStart(4, "0")}`,
    customerId: customer.id,
    requestDate: now.slice(0, 10),
    assigneeId: assignee.id,
    priority: input.priority,
    remarks: input.remarks?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    previousRequestId: input.previousRequestId,
  };
  let instanceCounter = state.counters.serviceInstance ?? 0;
  const instances: ServiceInstance[] = chosen.flatMap((service) => {
    if (!service) return [];
    instanceCounter += 1;
    return [
      {
        id: `si-${instanceCounter}`,
        requestId: request.id,
        serviceId: service.id,
        assigneeId: assignee.id,
        status: "Draft",
        assessmentRequired: service.financialAssessment,
        assessmentStatus: service.financialAssessment ? "Pending" : "Not required",
        checklist: service.documentCodes.map((code) => {
          const master = state.documents.find((item) => item.code === code);
          const reusable = reusableDocument(state, customer.id, code);
          return {
            id: `${request.id}-${service.id}-${code}`,
            documentCode: code,
            name: master?.name ?? code,
            requirement: "Mandatory" as const,
            status: reusable ? ("Approved" as const) : ("Pending" as const),
            linkedFrom: reusable,
            fileName: reusable ? "Linked from an approved document" : undefined,
          };
        }).filter((item, _index, all) => all.findIndex((row) => row.documentCode === item.documentCode) === _index),
      },
    ];
  });
  const next = withAudit(
    {
      ...state,
      counters: { ...state.counters, request: n, serviceInstance: instanceCounter },
      serviceRequests: [request, ...state.serviceRequests],
      serviceInstances: [...instances, ...state.serviceInstances],
    },
    actor.id,
    "Create",
    "Service Request",
    request.number,
    { detail: `${instances.length} service instance${instances.length === 1 ? "" : "s"} created.` },
  );
  return { state: next, id: request.id };
}

function replaceInstance(state: State, nextInstance: ServiceInstance, actor: User, action: string, detail: string, previous?: string): State {
  const request = state.serviceRequests.find((item) => item.id === nextInstance.requestId);
  const updated = touchRequest(
    {
      ...state,
      serviceInstances: state.serviceInstances.map((item) => (item.id === nextInstance.id ? nextInstance : item)),
    },
    nextInstance.requestId,
  );
  return withAudit(updated, actor.id, action, "Service Request", request?.number ?? nextInstance.id, {
    previous,
    next: nextInstance.status,
    detail,
  });
}

export function setChecklistStatus(state: State, instanceId: string, itemId: string, status: ServiceInstance["checklist"][number]["status"], actor: User, rejectionReason?: string): { state: State; error?: string } {
  const instance = state.serviceInstances.find((item) => item.id === instanceId);
  if (!instance) return { state, error: "Service instance not found." };
  if (isTerminal(instance.status) || instance.status === "On Hold") return { state, error: "This service is not open for document changes." };
  const item = instance.checklist.find((row) => row.id === itemId);
  if (!item) return { state, error: "Checklist item not found." };
  if (status === "Rejected" && !rejectionReason?.trim()) return { state, error: "A rejection reason is required." };
  const nextInstance: ServiceInstance = {
    ...instance,
    checklist: instance.checklist.map((row) =>
      row.id === itemId ? { ...row, status, rejectionReason: status === "Rejected" ? rejectionReason?.trim() : undefined, linkedFrom: status === "Approved" ? row.linkedFrom : undefined } : row,
    ),
  };
  let next = replaceInstance(state, nextInstance, actor, "Verify document", `${item.name} marked ${status}.`, item.status);
  const request = state.serviceRequests.find((row) => row.id === instance.requestId);
  const href = `/service-requests/${instance.requestId}`;
  if (status === "Rejected") next = notice(next, "Document rejected", `${item.name} was rejected on ${request?.number ?? instance.id}. ${rejectionReason ?? ""}`.trim(), href, instance.assigneeId);
  if (status === "Expired") next = notice(next, "Document expiring", `${item.name} is expired on ${request?.number ?? instance.id}.`, href, instance.assigneeId);
  return { state: next };
}

export function sendServiceInvitation(state: State, requestId: string, actor: User): { state: State; error?: string } {
  const request = state.serviceRequests.find((item) => item.id === requestId);
  const customer = state.customers.find((item) => item.id === request?.customerId);
  const contact = customer?.contacts.find((item) => item.email);
  if (!request || !customer || !contact?.email) return { state, error: "The customer needs a contact email before an invitation can be sent." };
  const outstanding = state.serviceInstances
    .filter((item) => item.requestId === request.id)
    .flatMap((item) => item.checklist)
    .some((item) => item.requirement === "Mandatory" && item.status !== "Approved");
  if (!outstanding) return { state, error: "Every mandatory document is already approved. No invitation is needed." };
  const expires = new Date();
  expires.setDate(expires.getDate() + 14);
  const invitation = {
    id: uid("inv"),
    applicationId: "",
    requestId: request.id,
    contactId: contact.id,
    email: contact.email.trim(),
    mobile: contact.mobile,
    expiresAt: expires.toISOString(),
    template: "Service document checklist",
    message: `Upload the outstanding documents for ${request.number}.`,
    status: "Sent" as const,
    sentAt: new Date().toISOString(),
    sentBy: actor.id,
  };
  const next = notice(
    withAudit({ ...state, invitations: [invitation, ...state.invitations] }, actor.id, "Invite", "Service Request", request.number, {
      detail: `Portal invitation sent to ${invitation.email}.`,
    }),
    "Customer portal invitation",
    `${contact.name} can upload documents for ${request.number}.`,
    `/service-requests/${request.id}`,
    request.assigneeId,
  );
  return { state: next };
}

export function uploadServiceDocument(state: State, itemId: string, fileName: string, uploadedBy: string): { state: State; error?: string } {
  const instance = state.serviceInstances.find((item) => item.checklist.some((row) => row.id === itemId));
  const item = instance?.checklist.find((row) => row.id === itemId);
  if (!instance || !item) return { state, error: "This document is not on an open service checklist." };
  if (item.status === "Approved") return { state, error: "This document is already approved." };
  const master = state.documents.find((doc) => doc.code === item.documentCode);
  if (master && fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!master.fileTypes.map((type) => type.toLowerCase().replace(".", "")).includes(ext)) {
      return { state, error: `Use one of these types: ${master.fileTypes.join(", ")}.` };
    }
  }
  const request = state.serviceRequests.find((row) => row.id === instance.requestId);
  const nextInstance: ServiceInstance = {
    ...instance,
    checklist: instance.checklist.map((row) => (row.id === itemId ? { ...row, status: "Uploaded", fileName, rejectionReason: undefined } : row)),
  };
  let next = replaceInstance(state, nextInstance, { id: uploadedBy } as User, "Upload document", `${item.name} uploaded as ${fileName}.`, item.status);
  next = notice(next, "Document uploaded", `${item.name} is waiting for review on ${request?.number ?? instance.requestId}.`, `/service-requests/${instance.requestId}`, instance.assigneeId);
  return { state: next };
}

export function transitionService(
  state: State,
  instanceId: string,
  action: "start" | "review" | "docs-complete" | "process" | "hold" | "resume" | "complete" | "reject" | "cancel" | "save-assessment-draft" | "finalize-assessment",
  actor: User,
  extra?: { reason?: string; result?: ServiceInstance["assessmentResult"]; remarks?: string; periodId?: string },
): { state: State; error?: string } {
  const instance = state.serviceInstances.find((item) => item.id === instanceId);
  if (!instance) return { state, error: "Service instance not found." };
  if (isTerminal(instance.status) && action !== "resume") return { state, error: "A completed, rejected, or cancelled service is read-only." };
  const now = new Date().toISOString();
  const reason = extra?.reason?.trim() ?? "";
  let next: ServiceInstance = { ...instance };

  if (action === "start") {
    if (instance.status !== "Draft") return { state, error: "Only a draft service can be started." };
    next = { ...instance, status: "Documents Pending", startedAt: now };
  } else if (action === "review") {
    if (instance.status !== "Documents Pending") return { state, error: "Documents can be sent for review only while collection is open." };
    next = { ...instance, status: "Documents Under Review" };
  } else if (action === "docs-complete") {
    if (instance.status !== "Documents Under Review" && instance.status !== "Documents Pending") {
      return { state, error: "Documentation can be completed only during collection or review." };
    }
    if (!mandatoryApproved(instance)) return { state, error: "All mandatory documents must be approved before documentation is completed." };
    next = { ...instance, status: "Documentation Completed" };
  } else if (action === "process") {
    if (instance.status !== "Documentation Completed") return { state, error: "Service processing starts after documentation is completed." };
    if (instance.assessmentRequired && instance.assessmentStatus !== "Finalized") {
      return { state, error: "Financial assessment must be finalized before this service can be processed." };
    }
    next = { ...instance, status: "Under Processing" };
  } else if (action === "save-assessment-draft") {
    if (!instance.assessmentRequired) return { state, error: "Financial assessment is not enabled for this service." };
    if (instance.assessmentStatus === "Finalized") return { state, error: "A finalized assessment cannot be returned to draft." };
    next = {
      ...instance,
      assessmentStatus: "Pending",
      assessmentResult: extra?.result,
      assessmentRemarks: extra?.remarks?.trim() || undefined,
      financialPeriodId: extra?.periodId || undefined,
    };
  } else if (action === "finalize-assessment") {
    if (!instance.assessmentRequired) return { state, error: "Financial assessment is not enabled for this service." };
    if (!extra?.periodId) return { state, error: "A financial reporting period is required." };
    if (!extra?.result) return { state, error: "Assessment result is required." };
    if (!extra.remarks?.trim()) return { state, error: "Assessment remarks are required." };
    const requestForPeriod = state.serviceRequests.find((row) => row.id === instance.requestId);
    const customerForPeriod = state.customers.find((row) => row.id === requestForPeriod?.customerId);
    const period = customerForPeriod?.turnovers?.find((row) => row.id === extra.periodId);
    if (!period) return { state, error: "Select a turnover period saved on the customer." };
    next = {
      ...instance,
      assessmentStatus: "Finalized",
      assessmentResult: extra.result,
      assessmentRemarks: extra.remarks.trim(),
      financialPeriodId: period.id,
      reviewedBy: actor.id,
      reviewedAt: now,
      assessmentSnapshot: { from: period.from, to: period.to, sales: period.sales, pos: period.pos, bank: period.bank, source: period.source },
    };
  } else if (action === "hold") {
    if (instance.status === "On Hold" || isTerminal(instance.status) || instance.status === "Draft") {
      return { state, error: "This service cannot be placed on hold from its current status." };
    }
    if (!reason) return { state, error: "A hold reason is required." };
    next = { ...instance, status: "On Hold", heldFrom: instance.status, holdReason: reason };
  } else if (action === "resume") {
    if (instance.status !== "On Hold" || !instance.heldFrom) return { state, error: "Only a held service can be resumed." };
    if (!mandatoryApproved({ ...instance, status: instance.heldFrom }) && (instance.heldFrom === "Documentation Completed" || instance.heldFrom === "Under Processing")) {
      return { state, error: "Expired or unapproved mandatory documents must be resolved before the service resumes." };
    }
    next = { ...instance, status: instance.heldFrom, holdReason: undefined };
  } else if (action === "complete") {
    if (instance.status === "On Hold") return { state, error: "Resume the service before completing it." };
    if (instance.status !== "Under Processing") return { state, error: "The service must be under processing before it can be completed." };
    if (!mandatoryApproved(instance)) return { state, error: "Mandatory documents must be approved and valid." };
    if (instance.assessmentRequired && instance.assessmentStatus !== "Finalized") return { state, error: "Financial assessment must be finalized." };
    if (!reason) return { state, error: "Completion remarks are required." };
    next = { ...instance, status: "Completed", completedAt: now, remarks: reason };
  } else if (action === "reject") {
    if (instance.status === "Draft" || instance.status === "On Hold") return { state, error: "A draft or held service is cancelled, not rejected." };
    if (!reason) return { state, error: "A closure reason is required." };
    next = { ...instance, status: "Rejected", completedAt: now, closureReason: reason };
  } else if (action === "cancel") {
    if (!reason) return { state, error: "A closure reason is required." };
    next = { ...instance, status: "Cancelled", completedAt: now, closureReason: reason };
  }

  const label: Record<typeof action, string> = {
    start: "Start service",
    review: "Send documents for review",
    "docs-complete": "Complete documentation",
    process: "Start processing",
    "save-assessment-draft": "Save assessment draft",
    hold: "Hold service",
    resume: "Resume service",
    complete: "Complete service",
    reject: "Reject service",
    cancel: "Cancel service",
    "finalize-assessment": "Finalize assessment",
  };
  let recorded = replaceInstance(state, next, actor, label[action], reason || next.status, instance.status);
  const href = `/service-requests/${instance.requestId}`;
  if (action === "hold") recorded = notice(recorded, "Service put on hold", `${instance.id} is on hold. ${reason}`, href, instance.assigneeId);
  if (action === "complete") recorded = notice(recorded, "Service completed", `${instance.id} was completed.`, href, instance.assigneeId);
  return { state: recorded };
}

export function saveServiceActivity(
  state: State,
  input: Omit<ServiceActivity, "id" | "createdAt" | "status"> & { id?: string; status?: ServiceActivity["status"] },
  actor: User,
): { state: State; error?: string } {
  const subject = input.subject.trim();
  if (!subject) return { state, error: "Subject is required." };
  if (subject.length > 200) return { state, error: "Subject must be 200 characters or fewer." };
  if (!input.type) return { state, error: "Activity type is required." };
  const assignee = state.users.find((item) => item.id === input.assigneeId && item.status === "Active");
  if (!assignee) return { state, error: "Assigned employee must be an active user." };
  if ((input.type === "Task" || input.type === "Follow-up") && !input.due) return { state, error: "Due date is required for a task or follow-up." };
  const request = state.serviceRequests.find((item) => item.id === input.requestId);
  const href = `/service-requests/${input.requestId}`;
  const existing = input.id ? state.serviceActivities.find((item) => item.id === input.id) : undefined;
  if (existing && (existing.status === "Completed" || existing.status === "Cancelled")) {
    return { state, error: "Completed and cancelled activities cannot be edited." };
  }
  if (existing) {
    const previousDue = input.due && existing.due && input.due !== existing.due ? existing.due : existing.previousDue;
    const nextActivity: ServiceActivity = { ...existing, ...input, subject, previousDue };
    let next = withAudit(
      { ...state, serviceActivities: state.serviceActivities.map((item) => (item.id === existing.id ? nextActivity : item)) },
      actor.id,
      previousDue && previousDue !== existing.previousDue ? "Reschedule follow-up" : "Update activity",
      "Service Request",
      request?.number ?? input.requestId,
      { detail: subject, previous: existing.due, next: input.due },
    );
    if (existing.assigneeId !== assignee.id) next = notice(next, "Activity reassigned", subject, href, assignee.id);
    return { state: next };
  }
  const activity: ServiceActivity = {
    ...input,
    id: uid("act"),
    subject,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  let next = withAudit(
    { ...state, serviceActivities: [activity, ...state.serviceActivities] },
    actor.id,
    "Create activity",
    "Service Request",
    request?.number ?? input.requestId,
    { detail: `${activity.type}: ${subject}` },
  );
  next = notice(next, "Activity assigned", `${activity.type}: ${subject}`, href, assignee.id);
  if (activity.type === "Follow-up" && activity.due) next = notice(next, "Follow-up due", `${subject} is due ${activity.due}.`, href, assignee.id);
  return { state: next };
}

export function progressServiceActivity(
  state: State,
  activityId: string,
  action: "start" | "complete" | "cancel",
  actor: User,
  remarks?: string,
): { state: State; error?: string } {
  const activity = state.serviceActivities.find((item) => item.id === activityId);
  if (!activity) return { state, error: "Activity not found." };
  if (activity.status === "Completed" || activity.status === "Cancelled") return { state, error: "This activity is closed." };
  const note = remarks?.trim() ?? "";
  const request = state.serviceRequests.find((item) => item.id === activity.requestId);
  let nextActivity = activity;
  if (action === "start") nextActivity = { ...activity, status: "In Progress" };
  if (action === "complete") {
    if (!note) return { state, error: "Completion remarks are required." };
    nextActivity = { ...activity, status: "Completed", completionRemarks: note, completedBy: actor.id, completedAt: new Date().toISOString() };
  }
  if (action === "cancel") {
    if (!note) return { state, error: "A cancellation reason is required." };
    nextActivity = { ...activity, status: "Cancelled", cancelReason: note };
  }
  const next = withAudit(
    { ...state, serviceActivities: state.serviceActivities.map((item) => (item.id === activity.id ? nextActivity : item)) },
    actor.id,
    action === "complete" ? "Complete activity" : action === "cancel" ? "Cancel activity" : "Start activity",
    "Service Request",
    request?.number ?? activity.requestId,
    { previous: activity.status, next: nextActivity.status, detail: note || activity.subject },
  );
  return { state: next };
}

export function saveLoanDelivery(state: State, input: Omit<LoanDeliveryRecord, "id"> & { id?: string }, actor: User): { state: State; error?: string } {
  if (!input.bank) return { state, error: "Bank delivered is required." };
  if (input.bank === "Other" && !input.otherBank?.trim()) return { state, error: "Other bank name is required." };
  if (!input.loanType.trim() || !input.date) return { state, error: "Loan type and delivery date are required." };
  if (Number.isNaN(input.value) || input.value < 0) return { state, error: "Delivery value must be zero or greater." };
  const request = state.serviceRequests.find((item) => item.id === input.requestId);
  const record: LoanDeliveryRecord = { ...input, id: input.id ?? uid("ldv"), loanType: input.loanType.trim(), otherBank: input.otherBank?.trim() || undefined };
  const exists = state.loanDeliveries.some((item) => item.id === record.id);
  const loanDeliveries = exists ? state.loanDeliveries.map((item) => (item.id === record.id ? record : item)) : [record, ...state.loanDeliveries];
  return {
    state: withAudit({ ...state, loanDeliveries }, actor.id, exists ? "Update delivery" : "Record delivery", "Service Request", request?.number ?? input.requestId, {
      detail: `${record.bank} · ${record.loanType}`,
    }),
  };
}

export function addExtraction(
  state: State,
  input: Omit<ExtractionRecord, "id" | "status" | "extractedValue"> & { extractedValue?: string },
  actor: User,
): { state: State; error?: string } {
  if (!input.customerId || !input.documentName.trim() || !input.field.trim()) return { state, error: "Customer, document, and field are required." };
  const row: ExtractionRecord = {
    ...input,
    id: uid("ext"),
    documentName: input.documentName.trim(),
    field: input.field.trim(),
    extractedValue: input.extractedValue?.trim() ?? "",
    verifiedValue: input.verifiedValue?.trim() ?? "",
    status: "Pending Review",
  };
  const customer = state.customers.find((item) => item.id === row.customerId);
  return {
    state: withAudit({ ...state, extractions: [row, ...state.extractions] }, actor.id, "Prepare extraction", "AI", customer?.code ?? row.customerId, {
      detail: "No extraction provider is configured. The extracted value was left blank for manual review.",
    }),
  };
}

export function reviewExtraction(state: State, id: string, decision: "Verified" | "Rejected", verifiedValue: string, actor: User): { state: State; error?: string } {
  const row = state.extractions.find((item) => item.id === id);
  if (!row) return { state, error: "Extraction record not found." };
  if (row.status === "Verified" && decision === "Verified" && verifiedValue.trim() !== row.verifiedValue) {
    return { state, error: "A verified value cannot be replaced by a new extraction. Edit it on the customer financial record." };
  }
  const value = verifiedValue.trim();
  if (decision === "Verified" && !value) return { state, error: "Enter the verified value before confirming it." };
  let nextState: State = {
    ...state,
    extractions: state.extractions.map((item) => (item.id === id ? { ...item, status: decision, verifiedValue: decision === "Verified" ? value : item.verifiedValue } : item)),
  };
  if (decision === "Verified" && row.periodFrom && row.periodTo) {
    const customer = state.customers.find((item) => item.id === row.customerId);
    if (customer) {
      const periods = customer.turnovers ?? [];
      const same = periods.find((item) => item.from === row.periodFrom && item.to === row.periodTo);
      const amount = Number(value);
      const numeric = Number.isFinite(amount) ? amount : 0;
      if (same?.source === "Reviewed Document") {
        nextState = withAudit(nextState, actor.id, "Verify extraction", "AI", customer.code, {
          detail: `${row.field} verified. The existing reviewed period was left unchanged.`,
        });
        return { state: nextState };
      }
      const key = row.field.toLowerCase().includes("pos") ? "pos" : row.field.toLowerCase().includes("bank") ? "bank" : row.field.toLowerCase().includes("sales") ? "sales" : "";
      if (key) {
        const period = same ?? { id: uid("trn"), from: row.periodFrom, to: row.periodTo, sales: 0, pos: 0, bank: 0, source: "Reviewed Document" as const };
        const updated = { ...period, [key]: numeric, source: "Reviewed Document" as const };
        const turnovers = same ? periods.map((item) => (item.id === same.id ? updated : item)) : [...periods, updated];
        nextState = { ...nextState, customers: nextState.customers.map((item) => (item.id === customer.id ? { ...item, turnovers } : item)) };
      }
    }
  }
  const customer = state.customers.find((item) => item.id === row.customerId);
  return {
    state: withAudit(nextState, actor.id, decision === "Verified" ? "Verify extraction" : "Reject extraction", "AI", customer?.code ?? row.customerId, {
      detail: `${row.field}: ${decision}`,
    }),
  };
}

export function finalizeStatements(state: State, customerId: string, actor: User): State {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer?.statement) return state;
  return updateCustomer(state, customerId, { statement: { ...customer.statement, status: "Finalized" }, profileStatus: "Ready for Review" }, actor, "Bank statement insights marked reviewed.");
}
