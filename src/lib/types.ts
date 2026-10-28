export type UserRole = "Admin" | "Sales" | "Credit Analyst" | "Operations" | "Management";

export type Department = "Sales" | "Credit" | "Operations" | "Administration" | "Management";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "In Discussion"
  | "Qualified"
  | "On Hold"
  | "Converted"
  | "Lost";

export type AppStatus =
  | "Draft"
  | "Document Collection"
  | "Document Verification"
  | "Credit Review"
  | "Ready for Bank Submission"
  | "Submitted to Bank"
  | "Bank Processing"
  | "Approved"
  | "Rejected"
  | "Disbursed"
  | "Closed"
  | "On Hold"
  | "Withdrawn";

export type Stage =
  | "Lead Qualification"
  | "Lending Application"
  | "Document Collection"
  | "Document Verification"
  | "Financial Profiling"
  | "Credit Review"
  | "Bank Submission"
  | "Bank Processing"
  | "Agreement"
  | "Loan Delivery"
  | "Closure";

export type StageStatus = "Pending" | "In Progress" | "Completed" | "On Hold";

export type DocStatus =
  | "Pending Upload"
  | "Uploaded"
  | "Awaiting Review"
  | "Approved"
  | "Rejected"
  | "Expired";

export type Requirement = "Mandatory" | "Optional" | "Conditional";

export type RuleStage = "collection" | "financial review" | "credit review" | "bank approval" | "agreement";

export type ModuleKey =
  | "Leads"
  | "Applications"
  | "Verification"
  | "Financials"
  | "Credit"
  | "Banks"
  | "Tasks"
  | "Users"
  | "Documents"
  | "Audit";

export type PermFlags = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  employeeCode?: string;
  department: Department;
  role: string;
  managerId?: string;
  status: "Active" | "Inactive";
  password: string;
};

export type RoleConfig = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  scope: "Own" | "Assigned" | "Department" | "All";
  permissions: Record<ModuleKey, PermFlags>;
};

export type Contact = {
  id: string;
  name: string;
  designation?: string;
  type: "Owner" | "Signatory" | "Other";
  mobile: string;
  email: string;
  alternate?: string;
  nationality?: string;
};

export type Shareholder = {
  id: string;
  name: string;
  share: number;
  countryOfBirth: string;
  residency: string;
};

export type BankRelationship = {
  id: string;
  bank: string;
  relationshipType?: string;
  account?: string;
  status?: string;
};
export type Exposure = {
  id: string;
  bank: string;
  facility: string;
  value: number;
  emi: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  document?: string;
};
export type VatReturn = { id: string; from: string; to: string; amount: number; status: string; attachment?: string; remarks?: string };
export type AuditYear = {
  id: string;
  year: string;
  firm?: string;
  revenue?: number;
  profit?: number;
  assets?: number;
  liabilities?: number;
  attachment?: string;
  remarks?: string;
};
export type TurnoverSource = "Manual" | "AI Extracted" | "Reviewed Document";

export type TurnoverPeriod = {
  id: string;
  from: string;
  to: string;
  sales: number;
  pos: number;
  bank: number;
  source: TurnoverSource;
  remarks?: string;
};

export type AverageBalance = {
  id: string;
  bank: string;
  otherBank?: string;
  from: string;
  to: string;
  average: number;
  source: TurnoverSource;
};

export type ChequeBounce = {
  id: string;
  date: string;
  amount: number;
  status: string;
  remarks: string;
  bank?: string;
  otherBank?: string;
  bounceCount?: number;
};

export type ProfileStatus =
  | "Not Started"
  | "Draft"
  | "Pending Documents"
  | "Ready for Review"
  | "Under Review"
  | "Correction Required"
  | "Finalized";

export type StatementMonth = { label: string; covered: boolean };

export type StatementInsight = {
  bank: string;
  account: string;
  window: "3 months" | "6 months" | "12 months";
  from: string;
  to: string;
  months: StatementMonth[];
  credits: number;
  debits: number;
  averageBalance: number;
  turnover: number;
  flags: string[];
  status: "Pending" | "In review" | "Finalized";
};

export type Customer = {
  id: string;
  code: string;
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
  moa: "Yes" | "No";
  moaAmendments: number;
  amendmentDates: string[];
  poa?: string;
  vatCertificate: "Yes" | "No";
  vatDocument?: string;
  corporateCertificate: "Yes" | "No";
  corporateDocument?: string;
  salesTurnover?: number;
  salesPeriod?: string;
  posTurnover?: number;
  posPeriod?: string;
  bankTurnover?: number;
  bankPeriod?: string;
  avgBalance6?: number;
  avgBalance12?: number;
  auditAvailable: "Yes" | "No";
  chequeBounce: "Yes" | "No";
  contacts: Contact[];
  shareholders: Shareholder[];
  banks: BankRelationship[];
  exposures: Exposure[];
  vatReturns: VatReturn[];
  audits: AuditYear[];
  bounces: ChequeBounce[];
  turnovers?: TurnoverPeriod[];
  averageBalances?: AverageBalance[];
  statement?: StatementInsight;
  leadStatus: LeadStatus;
  leadSource?: string;
  channel?: string;
  service: string;
  loanType?: string;
  requestedAmount?: number;
  preferredBank?: string;
  purpose?: string;
  expectedDate?: string;
  remarks?: string;
  assignedTo: string;
  folderRef: string;
  profileStatus: ProfileStatus;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

export type Application = {
  id: string;
  number: string;
  customerId: string;
  ownerContactId: string;
  assignedTo: string;
  channel?: string;
  date: string;
  service: string;
  loanType: string;
  amount: number;
  purpose: string;
  preferredBanks: string[];
  tenureMonths?: number;
  financingDate?: string;
  remarks?: string;
  snapshot?: ProfileSnapshot;
  status: AppStatus;
  currentStage: Stage;
  stageStatus: StageStatus;
  pendingWith?: string;
  pendingReason?: string;
  stageStarted: string;
  expectedCompletion?: string;
  snapshotLabel: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

export type ChecklistItem = {
  id: string;
  applicationId: string;
  documentCode: string;
  name: string;
  category: string;
  requirement: Requirement;
  stage: RuleStage;
  status: DocStatus;
  customerUpload: boolean;
  multiple: boolean;
  expiryApplicable: boolean;
  aiEnabled: boolean;
  requiredNow: boolean;
  rejectionReason?: string;
  instructions?: string;
};

export type AiResult = {
  documentType: string;
  companyName: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  match: "Match" | "Mismatch";
  findings: string[];
  confidence: number;
  processing: "Passed" | "Flagged" | "Failed";
};

export type DocVersion = {
  id: string;
  checklistItemId: string;
  applicationId: string;
  version: number;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "Awaiting Review" | "Under Review" | "Approved" | "Rejected";
  issueDate?: string;
  expiryDate?: string;
  periodFrom?: string;
  periodTo?: string;
  reference?: string;
  remarks?: string;
  assigneeId?: string;
  reviewerId?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  comments?: string;
  exceptionReason?: string;
  ai?: AiResult;
};

export type BankSubmission = {
  id: string;
  reference: string;
  applicationId: string;
  bank: string;
  branch?: string;
  manager?: string;
  phone?: string;
  email?: string;
  submittedOn: string;
  amount: number;
  loanType: string;
  status:
    | "Draft"
    | "Submitted"
    | "Under Bank Review"
    | "Additional Documents Required"
    | "Approved"
    | "Rejected"
    | "Withdrawn";
  remarks?: string;
  documentsNote?: string;
  overrideReason?: string;
  responseDate?: string;
  responseStatus?: string;
  approvedAmount?: number;
  rate?: number;
  tenure?: number;
  emi?: number;
  offerNote?: string;
  additionalRequest?: string;
};

export type Delivery = {
  id: string;
  applicationId: string;
  bank: string;
  loanType: string;
  date: string;
  amount: number;
  offerNote?: string;
  profilingRef?: string;
  remarks?: string;
  recordedBy: string;
  recordedAt: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type ProfileSnapshot = {
  salesTurnover?: number;
  bankTurnover?: number;
  posTurnover?: number;
  avgBalance6?: number;
  avgBalance12?: number;
  employees?: number;
  chequeBounce: "Yes" | "No";
  bounceCount: number;
  auditAvailable: "Yes" | "No";
  auditYears: string;
  vatSummary: string;
  exposureSummary: string;
  profileStatus: string;
  capturedAt: string;
};

export type Agreement = {
  id: string;
  applicationId: string;
  type: string;
  documentName: string;
  provider: string;
  recipientNames: string[];
  sentAt?: string;
  signedAt?: string;
  status: "Draft" | "Sent" | "Viewed" | "Partially Signed" | "Signed" | "Completed" | "Declined" | "Expired" | "Failed";
  envelopeId?: string;
  remarks?: string;
  error?: string;
};

export type CreditReview = {
  id: string;
  applicationId: string;
  profileLabel: string;
  decision: "Eligible" | "Not Eligible" | "More Information Required" | "On Hold";
  notes: string;
  conditions?: string;
  reviewerId: string;
  reviewedAt: string;
};

export type Closure = {
  id: string;
  applicationId: string;
  outcome:
    | "Successfully Disbursed"
    | "Partially Disbursed"
    | "Rejected"
    | "Customer Withdrawn"
    | "Cancelled"
    | "Closed, other";
  approvedAmount?: number;
  deliveredAmount: number;
  closedAt: string;
  reason?: string;
  remarks: string;
  closedBy: string;
};

export type Task = {
  id: string;
  applicationId: string;
  name: string;
  description?: string;
  stage: Stage;
  department: Department;
  assigneeId: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedAt: string;
  due: string;
  status:
    | "To Do"
    | "In Progress"
    | "Waiting for Customer"
    | "Waiting for Bank"
    | "On Hold"
    | "Completed"
    | "Cancelled";
  remarks?: string;
  completedAt?: string;
};

export type FollowUp = {
  id: string;
  applicationId: string;
  contactId: string;
  type: "Call" | "Email" | "Meeting" | "Other";
  at: string;
  purpose: string;
  summary: string;
  response?: string;
  nextAt?: string;
  ownerId: string;
  status: "Open" | "Completed";
};

export type Invitation = {
  id: string;
  applicationId: string;
  requestId?: string;
  customerId?: string;
  contactId: string;
  email: string;
  mobile: string;
  expiresAt: string;
  template: string;
  message?: string;
  status: "Sent" | "Opened" | "Revoked" | "Expired";
  sentAt: string;
  sentBy: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actorId: string;
  action: string;
  module: string;
  record: string;
  detail?: string;
  previous?: string;
  next?: string;
};

export type Notice = {
  id: string;
  title: string;
  detail: string;
  href: string;
  read: boolean;
  at: string;
  userId?: string;
};

export type DocCategory = {
  id: string;
  code: string;
  name: string;
  description?: string;
  order: number;
  status: "Active" | "Inactive";
};

export type DocumentMaster = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  fileTypes: string[];
  maxMb: number;
  multiple: boolean;
  expiryApplicable: boolean;
  issueDateRequired: boolean;
  expiryDateRequired: boolean;
  versioned: boolean;
  customerUpload: boolean;
  internalUpload: boolean;
  ai: boolean;
  reminderDays: number[];
  status: "Active" | "Inactive";
};

export type ChecklistRule = {
  id: string;
  service: string;
  documentCode: string;
  requirement: Requirement;
  stage: RuleStage;
  minFiles: number;
  maxFiles?: number;
  customerUpload: boolean;
  displayOrder: number;
  status: "Active" | "Inactive";
  condition?: { field: "moaAmendments" | "exposures" | "chequeBounce"; operator: ">" | "="; value: string };
};

export type ServiceDocStatus = "Pending" | "Uploaded" | "Under Review" | "Approved" | "Rejected" | "Expired";

export type ServiceFile = {
  id: string;
  version: number;
  fileName: string;
  size: number;
  dataUrl?: string;
  uploadedBy: string;
  uploadedByType: "Customer" | "Employee";
  receivedThrough?: "Email" | "In Person" | "Other";
  uploadedAt: string;
  reference?: string;
  issueDate?: string;
  expiryDate?: string;
  periodFrom?: string;
  periodTo?: string;
  remarks?: string;
  status: "Uploaded" | "Approved" | "Rejected" | "Expired";
  rejectionReason?: string;
  reviewRemarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
};

export type ServiceChecklistItem = {
  id: string;
  documentCode: string;
  name: string;
  requirement: "Mandatory" | "Optional";
  status: ServiceDocStatus;
  rejectionReason?: string;
  linkedFrom?: string;
  fileName?: string;
  minFiles?: number;
  maxFiles?: number;
  expiryDate?: string;
  files?: ServiceFile[];
  replacementAuthorized?: boolean;
};

export type ServiceDefinition = {
  id: string;
  name: string;
  status: "Active" | "Inactive";
  financialAssessment: boolean;
  documentCodes: string[];
};

export type ServiceStatus =
  | "Draft"
  | "Documents Pending"
  | "Documents Under Review"
  | "Documentation Completed"
  | "Under Processing"
  | "On Hold"
  | "Completed"
  | "Rejected"
  | "Cancelled";

export type ParentRequestStatus = "Draft" | "In Progress" | "On Hold" | "Completed" | "Cancelled" | "Closed – Mixed Outcome";

export type AssessmentResult = "Satisfactory" | "Requires Clarification" | "Not Satisfactory";

export type ServiceInstance = {
  id: string;
  requestId: string;
  serviceId: string;
  assigneeId: string;
  status: ServiceStatus;
  heldFrom?: ServiceStatus;
  holdReason?: string;
  startedAt?: string;
  completedAt?: string;
  remarks?: string;
  assessmentRequired: boolean;
  assessmentStatus: "Not required" | "Pending" | "Finalized";
  assessmentResult?: AssessmentResult;
  assessmentRemarks?: string;
  financialPeriodId?: string;
  assessmentSnapshot?: { from: string; to: string; sales: number; pos: number; bank: number; source: TurnoverSource };
  reviewedBy?: string;
  reviewedAt?: string;
  checklist: ServiceChecklistItem[];
  reviewFlag?: string;
  closureReason?: string;
};

export type ServiceActivityType = "Task" | "Follow-up" | "Call" | "Meeting" | "Other";
export type ServiceActivityStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

export type ServiceActivity = {
  id: string;
  instanceId: string;
  requestId: string;
  type: ServiceActivityType;
  subject: string;
  assigneeId: string;
  due?: string;
  description?: string;
  status: ServiceActivityStatus;
  completionRemarks?: string;
  completedBy?: string;
  completedAt?: string;
  cancelReason?: string;
  communicationWith?: "Customer" | "Bank" | "Other";
  contact?: string;
  notes?: string;
  previousDue?: string;
  createdAt: string;
};

export type LoanDeliveryRecord = {
  id: string;
  customerId: string;
  instanceId: string;
  requestId: string;
  bank: string;
  otherBank?: string;
  loanType: string;
  date: string;
  value: number;
  remarks?: string;
};

export type ExtractionRecord = {
  id: string;
  customerId: string;
  documentName: string;
  field: string;
  extractedValue: string;
  verifiedValue: string;
  status: "Pending Review" | "Verified" | "Rejected";
  periodFrom?: string;
  periodTo?: string;
};

export type ServiceRequestRecord = {
  id: string;
  number: string;
  customerId: string;
  requestDate: string;
  assigneeId: string;
  priority: "Normal" | "High";
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  previousRequestId?: string;
};

export type Counters = {
  customer: number;
  application: number;
  submission: number;
  task: number;
  followUp: number;
  user: number;
  document: number;
  request: number;
  serviceInstance: number;
};

export type State = {
  users: User[];
  roles: RoleConfig[];
  customers: Customer[];
  applications: Application[];
  checklist: ChecklistItem[];
  versions: DocVersion[];
  submissions: BankSubmission[];
  deliveries: Delivery[];
  agreements: Agreement[];
  reviews: CreditReview[];
  closures: Closure[];
  tasks: Task[];
  followUps: FollowUp[];
  invitations: Invitation[];
  audit: AuditEvent[];
  notices: Notice[];
  categories: DocCategory[];
  documents: DocumentMaster[];
  rules: ChecklistRule[];
  services: ServiceDefinition[];
  serviceRequests: ServiceRequestRecord[];
  serviceInstances: ServiceInstance[];
  serviceActivities: ServiceActivity[];
  loanDeliveries: LoanDeliveryRecord[];
  extractions: ExtractionRecord[];
  counters: Counters;
  sessionUserId: string | null;
  portalEmail: string | null;
};
