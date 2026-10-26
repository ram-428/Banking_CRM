import { MODULES, noFlags } from "./constants";
import { uid } from "./format";
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
  FollowUp,
  State,
  Task,
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

function notice(state: State, title: string, detail: string, href: string): State {
  return {
    ...state,
    notices: [{ id: uid("nt"), title, detail, href, read: false, at: new Date().toISOString() }, ...state.notices],
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

export function updateCustomer(state: State, id: string, patch: Partial<Customer>, actor: User, detail: string): State {
  const current = state.customers.find((item) => item.id === id);
  if (!current) return state;
  const nextCustomer = { ...current, ...patch, id: current.id, code: current.code, updatedAt: new Date().toISOString(), updatedBy: actor.id };
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
  let next: State = {
    ...state,
    counters: { ...state.counters, submission: n },
    submissions: [submission, ...state.submissions],
    applications: state.applications.map((item) =>
      item.id === input.applicationId
        ? {
            ...item,
            status: "Submitted to Bank",
            currentStage: "Bank Processing",
            stageStatus: "In Progress",
            pendingWith: submission.bank,
            pendingReason: `Submitted to ${submission.bank}.`,
            updatedAt: new Date().toISOString(),
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
  let next: State = { ...state, submissions: state.submissions.map((item) => (item.id === id ? nextRow : item)) };
  if (patch.status === "Approved") {
    next = {
      ...next,
      applications: next.applications.map((item) =>
        item.id === current.applicationId
          ? { ...item, status: "Approved", currentStage: "Agreement", stageStatus: "In Progress", pendingWith: "Customer", pendingReason: `${current.bank} approved the facility.`, updatedAt: new Date().toISOString(), updatedBy: actor.id }
          : item,
      ),
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
  const delivery: Delivery = { ...input, id: uid("del"), recordedBy: actor.id, recordedAt: new Date().toISOString() };
  const app = state.applications.find((item) => item.id === input.applicationId);
  let next: State = {
    ...state,
    deliveries: [delivery, ...state.deliveries],
    applications: state.applications.map((item) =>
      item.id === input.applicationId
        ? { ...item, status: "Disbursed", currentStage: "Loan Delivery", stageStatus: "In Progress", pendingWith: "Operations", pendingReason: "A disbursement was recorded. Close the file when the outcome is final.", updatedAt: new Date().toISOString(), updatedBy: actor.id }
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
  return withAudit({ ...state, documents }, actor.id, exists ? "Update" : "Create", "Documents", input.name, {
    detail: "Master change does not alter checklists already generated.",
  });
}

export function saveCategory(state: State, input: State["categories"][number], actor: User): State {
  const exists = state.categories.some((item) => item.id === input.id);
  const categories = exists ? state.categories.map((item) => (item.id === input.id ? input : item)) : [...state.categories, input];
  return withAudit({ ...state, categories }, actor.id, exists ? "Update" : "Create", "Documents", input.name);
}

export function saveRule(state: State, input: State["rules"][number], actor: User): State {
  return withAudit(
    { ...state, rules: [...state.rules, input] },
    actor.id,
    "Create",
    "Documents",
    input.documentCode,
    { detail: "Applies to applications created after this change." },
  );
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

export function finalizeStatements(state: State, customerId: string, actor: User): State {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer?.statement) return state;
  return updateCustomer(state, customerId, { statement: { ...customer.statement, status: "Finalized" }, profileStatus: "Ready for Review" }, actor, "Bank statement insights marked reviewed.");
}
