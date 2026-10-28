"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, DataTable, Field, Gate, PageHeader, RowAction, StatusText, Tabs } from "@/components/ui";
import { can } from "@/lib/access";
import { saveCategory, saveDocument, saveRule } from "@/lib/actions";
import { FILE_TYPES, REMINDER_DAYS, RULE_STAGES } from "@/lib/constants";
import { uid } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { ChecklistRule, DocCategory, DocumentMaster, Requirement, RuleStage } from "@/lib/types";

const TABS = ["Categories", "Documents", "Checklist rules"];
const SERVICES = ["Lending Assistance"];

type RuleDraft = {
  id: string;
  service: string;
  documentCodes: string[];
  requirement: Requirement;
  stage: RuleStage;
  minFiles: string;
  maxFiles: string;
  customerUpload: boolean;
  displayOrder: string;
  status: "Active" | "Inactive";
  field: "" | "moaAmendments" | "exposures" | "chequeBounce";
  operator: ">" | "=";
  value: string;
};

function blankCategory(order: number): DocCategory {
  return { id: "", code: "", name: "", description: "", order, status: "Active" };
}

function blankDocument(code: string, categoryId: string): DocumentMaster {
  return {
    id: "",
    code,
    name: "",
    categoryId,
    description: "",
    fileTypes: ["pdf"],
    maxMb: 10,
    multiple: false,
    expiryApplicable: false,
    issueDateRequired: false,
    expiryDateRequired: false,
    versioned: true,
    customerUpload: true,
    internalUpload: true,
    ai: false,
    reminderDays: [],
    status: "Active",
  };
}

function blankRule(order: number): RuleDraft {
  return {
    id: "",
    service: "Lending Assistance",
    documentCodes: [],
    requirement: "Mandatory",
    stage: "collection",
    minFiles: "1",
    maxFiles: "",
    customerUpload: true,
    displayOrder: String(order),
    status: "Active",
    field: "",
    operator: ">",
    value: "",
  };
}

function tabFromQuery(value: string | null) {
  if (value === "categories") return "Categories";
  if (value === "rules") return "Checklist rules";
  return "Documents";
}

export default function DocumentsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, replace, user } = useDesk();
  const [tab, setTab] = useState(tabFromQuery(params.get("tab")));

  useEffect(() => {
    setTab(tabFromQuery(params.get("tab")));
    window.dispatchEvent(new Event("vrw-nav"));
  }, [params]);

  function selectTab(next: string) {
    setTab(next);
    const query = next === "Categories" ? "categories" : next === "Checklist rules" ? "rules" : "documents";
    router.replace(`/documents?tab=${query}`, { scroll: false });
  }
  const [category, setCategory] = useState<DocCategory | null>(null);
  const [document, setDocument] = useState<DocumentMaster | null>(null);
  const [rule, setRule] = useState<RuleDraft | null>(null);
  const [ruleCategory, setRuleCategory] = useState("All");
  const [error, setError] = useState("");

  if (!state || !user) return null;
  const canCreate = can(state, "Documents", "create");
  const canEdit = can(state, "Documents", "edit");

  function saveCat() {
    if (!category || !category.name.trim() || !category.order) {
      setError("Category name and display order are required.");
      return;
    }
    const input: DocCategory = category.id
      ? { ...category, name: category.name.trim() }
      : { ...category, id: uid("cat"), code: `CAT-${String(state!.categories.length + 1).padStart(3, "0")}`, name: category.name.trim() };
    replace(saveCategory(state!, input, user!));
    setCategory(null);
    setError("");
  }

  function saveDoc() {
    if (!document || !document.name.trim() || !document.categoryId || document.fileTypes.length === 0 || !document.maxMb) {
      setError("Name, category, at least one file type, and a maximum size are required.");
      return;
    }
    const input: DocumentMaster = document.id ? { ...document, name: document.name.trim() } : { ...document, id: uid("dm"), name: document.name.trim() };
    replace(saveDocument(state!, input, user!));
    setDocument(null);
    setError("");
  }

  function saveMapping() {
    if (!rule || rule.documentCodes.length === 0 || !rule.minFiles || Number(rule.minFiles) < 1 || !rule.displayOrder) {
      setError("Choose a document, a minimum file count, and a display order.");
      return;
    }
    if (rule.requirement === "Conditional" && (!rule.field || !rule.value.trim())) {
      setError("A conditional rule needs a field, an operator, and a value.");
      return;
    }
    let next = state!;
    for (const code of rule.documentCodes) {
      const existing = rule.id ? undefined : next.rules.find((item) => item.service === rule.service && item.documentCode === code);
      const input: ChecklistRule = {
        id: rule.id || existing?.id || uid("rule"),
        service: rule.service,
        documentCode: code,
        requirement: rule.requirement,
        stage: rule.stage,
        minFiles: Number(rule.minFiles),
        maxFiles: rule.maxFiles ? Number(rule.maxFiles) : undefined,
        customerUpload: rule.customerUpload,
        displayOrder: Number(rule.displayOrder),
        status: rule.status,
        condition: rule.requirement === "Conditional" && rule.field ? { field: rule.field, operator: rule.operator, value: rule.value.trim() } : undefined,
      };
      next = saveRule(next, input, user!);
    }
    replace(next);
    setRule(null);
    setError("");
  }

  const ruleDocuments = state.documents.filter((item) => ruleCategory === "All" || item.categoryId === ruleCategory);

  return (
    <Gate module="Documents">
      <div className="page">
        <PageHeader
          title="Document Master and Checklist Configuration"
          lede="Define each document once. A new application copies the active Lending Assistance rules. Later master changes leave existing checklists as they were."
        />
        <Tabs tabs={TABS} value={tab} onChange={selectTab} />

        {tab === "Categories" && (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Category code</th>
                  <th>Category name</th>
                  <th>Description</th>
                  <th>Display order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...state.categories]
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>{item.description || "None"}</td>
                      <td>{item.order}</td>
                      <td>
                        <StatusText value={item.status} />
                      </td>
                      <td>
                        {canEdit && (
                          <div className="row-actions">
                            <RowAction icon="edit" label="Edit" onClick={() => setCategory(item)} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </DataTable>
            {canCreate && (
              <div style={{ marginTop: 12 }}>
                <Button onClick={() => setCategory(blankCategory(state.categories.length + 1))}>Add category</Button>
              </div>
            )}
          </>
        )}

        {tab === "Documents" && (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Document code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>File types / size</th>
                  <th>Customer upload</th>
                  <th>AI</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.documents.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{state.categories.find((category) => category.id === item.categoryId)?.name ?? "None"}</td>
                    <td>
                      {item.fileTypes.join(", ")} · {item.maxMb} MB
                    </td>
                    <td>{item.customerUpload ? "Yes" : "No"}</td>
                    <td>{item.ai ? "Yes" : "No"}</td>
                    <td>
                      <StatusText value={item.status} />
                    </td>
                    <td>
                      {canEdit && (
                        <div className="row-actions">
                          <RowAction icon="edit" label="Edit" onClick={() => setDocument(item)} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {canCreate && (
              <div style={{ marginTop: 12 }}>
                <Button onClick={() => setDocument(blankDocument(`DOC-${state.counters.document + 1}`, state.categories[0]?.id ?? ""))}>Add document</Button>
              </div>
            )}
          </>
        )}

        {tab === "Checklist rules" && (
          <>
            <p className="hint" style={{ marginBottom: 12 }}>
              These rules are copied when an application is created. Changing a rule here does not rewrite a checklist that is already on a file.
            </p>
            <DataTable>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Document</th>
                  <th>Requirement</th>
                  <th>Stage</th>
                  <th>Files</th>
                  <th>Customer upload</th>
                  <th>Order / status</th>
                  <th>Conditional rule</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...state.rules]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((item) => {
                    const doc = state.documents.find((entry) => entry.code === item.documentCode);
                    return (
                      <tr key={item.id}>
                        <td>{item.service}</td>
                        <td>
                          {doc?.name ?? item.documentCode}
                          <div className="hint">{state.categories.find((category) => category.id === doc?.categoryId)?.name}</div>
                        </td>
                        <td>{item.requirement}</td>
                        <td>{item.stage}</td>
                        <td>
                          {item.minFiles}
                          {item.maxFiles ? ` to ${item.maxFiles}` : ""}
                        </td>
                        <td>{item.customerUpload ? "Yes" : "No"}</td>
                        <td>
                          {item.displayOrder}
                          <div className="hint">{item.status}</div>
                        </td>
                        <td>{item.condition ? `${item.condition.field} ${item.condition.operator} ${item.condition.value}` : "None"}</td>
                        <td>
                          {canEdit && (
                            <div className="row-actions">
                            <RowAction
                              icon="edit"
                              label="Edit"
                              onClick={() =>
                                setRule({
                                  id: item.id,
                                  service: item.service,
                                  documentCodes: [item.documentCode],
                                  requirement: item.requirement,
                                  stage: item.stage,
                                  minFiles: String(item.minFiles),
                                  maxFiles: item.maxFiles ? String(item.maxFiles) : "",
                                  customerUpload: item.customerUpload,
                                  displayOrder: String(item.displayOrder),
                                  status: item.status,
                                  field: item.condition?.field ?? "",
                                  operator: item.condition?.operator ?? ">",
                                  value: item.condition?.value ?? "",
                                })
                              }
                            />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </DataTable>
            {canCreate && (
              <div style={{ marginTop: 12 }}>
                <Button onClick={() => setRule(blankRule(state.rules.length + 1))}>Add checklist rule</Button>
              </div>
            )}
          </>
        )}

        <FormDialog
          open={!!category}
          title={category?.id ? "Edit category" : "Add category"}
          description="Category code is assigned when the category is saved."
          submitLabel={category?.id ? "Save category" : "Create category"}
          onClose={() => {
            setCategory(null);
            setError("");
          }}
          onSubmit={saveCat}
        >
          {error && <div className="banner banner-danger">{error}</div>}
          {category && (
            <div className="fields">
              <Field label="Category code">
                <input value={category.code || "Assigned on save"} readOnly />
              </Field>
              <Field label="Category name" required>
                <input value={category.name} onChange={(event) => setCategory({ ...category, name: event.target.value })} />
              </Field>
              <Field label="Description" className="span-2">
                <textarea value={category.description ?? ""} onChange={(event) => setCategory({ ...category, description: event.target.value })} />
              </Field>
              <Field label="Display order" required>
                <input value={category.order} onChange={(event) => setCategory({ ...category, order: Number(event.target.value) })} inputMode="numeric" />
              </Field>
              <Field label="Status" required>
                <select value={category.status} onChange={(event) => setCategory({ ...category, status: event.target.value as DocCategory["status"] })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
            </div>
          )}
        </FormDialog>

        <FormDialog
          open={!!document}
          wide
          title={document?.id ? "Edit document" : "Add document"}
          description="The document code stays fixed after it is created."
          submitLabel={document?.id ? "Save document" : "Create document"}
          onClose={() => {
            setDocument(null);
            setError("");
          }}
          onSubmit={saveDoc}
        >
          {error && <div className="banner banner-danger">{error}</div>}
          {document && (
            <div className="fields">
              <Field label="Document code">
                <input value={document.code} readOnly />
              </Field>
              <Field label="Document name" required>
                <input value={document.name} onChange={(event) => setDocument({ ...document, name: event.target.value })} />
              </Field>
              <Field label="Document category" required>
                <select value={document.categoryId} onChange={(event) => setDocument({ ...document, categoryId: event.target.value })}>
                  {state.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Maximum file size (MB)" required>
                <input value={document.maxMb} onChange={(event) => setDocument({ ...document, maxMb: Number(event.target.value) })} inputMode="numeric" />
              </Field>
              <Field label="Description / instructions" className="span-2">
                <textarea value={document.description ?? ""} onChange={(event) => setDocument({ ...document, description: event.target.value })} />
              </Field>
              <Field label="Allowed file types" required className="span-2">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {FILE_TYPES.map((type) => (
                    <label key={type} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={document.fileTypes.includes(type)}
                        onChange={() =>
                          setDocument({
                            ...document,
                            fileTypes: document.fileTypes.includes(type) ? document.fileTypes.filter((item) => item !== type) : [...document.fileTypes, type],
                          })
                        }
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </Field>
              <YesNo label="Multiple files allowed" value={document.multiple} onChange={(multiple) => setDocument({ ...document, multiple })} />
              <YesNo label="Expiry applicable" value={document.expiryApplicable} onChange={(expiryApplicable) => setDocument({ ...document, expiryApplicable })} />
              <YesNo label="Issue date required" value={document.issueDateRequired} onChange={(issueDateRequired) => setDocument({ ...document, issueDateRequired })} />
              <YesNo label="Expiry date required" value={document.expiryDateRequired} onChange={(expiryDateRequired) => setDocument({ ...document, expiryDateRequired })} />
              <YesNo label="Version control enabled" value={document.versioned} onChange={(versioned) => setDocument({ ...document, versioned })} />
              <YesNo label="Customer upload allowed" value={document.customerUpload} onChange={(customerUpload) => setDocument({ ...document, customerUpload })} />
              <YesNo label="Internal upload allowed" value={document.internalUpload} onChange={(internalUpload) => setDocument({ ...document, internalUpload })} />
              <YesNo label="AI extraction enabled" value={document.ai} onChange={(ai) => setDocument({ ...document, ai })} />
              <Field label="Expiry reminder days" className="span-2" hint="Optional. Reminders use the selected day counts before expiry.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {REMINDER_DAYS.map((day) => (
                    <label key={day} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={document.reminderDays.includes(day)}
                        onChange={() =>
                          setDocument({
                            ...document,
                            reminderDays: document.reminderDays.includes(day)
                              ? document.reminderDays.filter((item) => item !== day)
                              : [...document.reminderDays, day].sort((a, b) => b - a),
                          })
                        }
                      />
                      {day} days
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Status" required>
                <select value={document.status} onChange={(event) => setDocument({ ...document, status: event.target.value as DocumentMaster["status"] })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
            </div>
          )}
        </FormDialog>

        <FormDialog
          open={!!rule}
          wide
          title={rule?.id ? "Edit checklist rule" : "Add checklist rule"}
          description="The mapping is copied onto applications created after it is saved."
          submitLabel={rule?.id ? "Save rule" : "Save rule"}
          onClose={() => {
            setRule(null);
            setError("");
          }}
          onSubmit={saveMapping}
        >
          {error && <div className="banner banner-danger">{error}</div>}
          {rule && (
            <div className="fields">
              <Field label="Service" required>
                <select value={rule.service} onChange={(event) => setRule({ ...rule, service: event.target.value })}>
                  {SERVICES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Requirement type" required>
                <select value={rule.requirement} onChange={(event) => setRule({ ...rule, requirement: event.target.value as Requirement })}>
                  <option>Mandatory</option>
                  <option>Optional</option>
                  <option>Conditional</option>
                </select>
              </Field>
              <Field label="Required stage" required>
                <select value={rule.stage} onChange={(event) => setRule({ ...rule, stage: event.target.value as RuleStage })}>
                  {RULE_STAGES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Customer upload enabled" required>
                <select value={rule.customerUpload ? "Yes" : "No"} onChange={(event) => setRule({ ...rule, customerUpload: event.target.value === "Yes" })}>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </Field>
              <Field label="Minimum files" required>
                <input value={rule.minFiles} onChange={(event) => setRule({ ...rule, minFiles: event.target.value })} inputMode="numeric" />
              </Field>
              <Field label="Maximum files">
                <input value={rule.maxFiles} onChange={(event) => setRule({ ...rule, maxFiles: event.target.value })} inputMode="numeric" />
              </Field>
              <Field label="Display order" required>
                <input value={rule.displayOrder} onChange={(event) => setRule({ ...rule, displayOrder: event.target.value })} inputMode="numeric" />
              </Field>
              <Field label="Status" required>
                <select value={rule.status} onChange={(event) => setRule({ ...rule, status: event.target.value as RuleDraft["status"] })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
              <Field label="Document category" className="span-2">
                <select value={ruleCategory} onChange={(event) => setRuleCategory(event.target.value)} disabled={!!rule.id}>
                  <option>All</option>
                  {state.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Document name" required className="span-2">
                <div style={{ display: "grid", gap: 6 }}>
                  {ruleDocuments.map((item) => (
                    <label key={item.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={rule.documentCodes.includes(item.code)}
                        disabled={!!rule.id && item.code !== rule.documentCodes[0]}
                        onChange={() =>
                          setRule({
                            ...rule,
                            documentCodes: rule.id
                              ? [item.code]
                              : rule.documentCodes.includes(item.code)
                                ? rule.documentCodes.filter((code) => code !== item.code)
                                : [...rule.documentCodes, item.code],
                          })
                        }
                      />
                      {item.name}
                      <span className="hint">{item.code}</span>
                    </label>
                  ))}
                </div>
              </Field>
              {rule.requirement === "Conditional" && (
                <>
                  <Field label="Condition field" required>
                    <select value={rule.field} onChange={(event) => setRule({ ...rule, field: event.target.value as RuleDraft["field"] })}>
                      <option value="">Select</option>
                      <option value="moaAmendments">MOA amendment count</option>
                      <option value="exposures">Existing facilities</option>
                      <option value="chequeBounce">Cheque bounce</option>
                    </select>
                  </Field>
                  <Field label="Operator" required>
                    <select value={rule.operator} onChange={(event) => setRule({ ...rule, operator: event.target.value as RuleDraft["operator"] })}>
                      <option value=">">is greater than</option>
                      <option value="=">equals</option>
                    </select>
                  </Field>
                  <Field label="Value" required>
                    <input value={rule.value} onChange={(event) => setRule({ ...rule, value: event.target.value })} />
                  </Field>
                </>
              )}
            </div>
          )}
        </FormDialog>
      </div>
    </Gate>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Field label={label} required>
      <select value={value ? "Yes" : "No"} onChange={(event) => onChange(event.target.value === "Yes")}>
        <option>Yes</option>
        <option>No</option>
      </select>
    </Field>
  );
}
