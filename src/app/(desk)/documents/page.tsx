"use client";

import { useState } from "react";
import { Button, Field, Gate, PageHeader, StatusText } from "@/components/ui";
import { saveCategory, saveDocument, saveRule } from "@/lib/actions";
import { uid } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { ChecklistRule, DocumentMaster } from "@/lib/types";

export default function DocumentsPage() {
  const { state, replace, user } = useDesk();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("cat-legal");
  const [selected, setSelected] = useState<string>("dm-tl");
  if (!state || !user) return null;
  const current = state.documents.find((item) => item.id === selected);

  function updateDoc(patch: Partial<DocumentMaster>) {
    if (!current) return;
    replace(saveDocument(state!, { ...current, ...patch }, user!));
  }

  return (
    <Gate module="Documents">
      <div className="page">
        <PageHeader
          title="Document master"
          lede="Rules are copied onto an application when it is created. Editing a rule does not rewrite files already in progress."
        />
        <h2 className="block-title">Categories</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Order</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.categories.map((category) => (
              <tr key={category.id}>
                <td>{category.code}</td>
                <td>{category.name}</td>
                <td>{category.order}</td>
                <td>
                  <StatusText value={category.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ margin: "12px 0 28px" }}>
          <Button
            variant="secondary"
            onClick={() =>
              replace(
                saveCategory(
                  state,
                  { id: uid("cat"), code: `CAT-${state.categories.length + 1}`, name: "New category", order: state.categories.length + 1, status: "Active" },
                  user,
                ),
              )
            }
          >
            Add category
          </Button>
        </div>
        <h2 className="block-title">Documents</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Files</th>
              <th>AI</th>
              <th>Customer upload</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.code}</td>
                <td>
                  <button className="link" type="button" onClick={() => setSelected(doc.id)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                    {doc.name}
                  </button>
                </td>
                <td>
                  {doc.fileTypes.join(", ")} · {doc.maxMb} MB
                </td>
                <td>{doc.ai ? "On" : "Off"}</td>
                <td>{doc.customerUpload ? "Yes" : "No"}</td>
                <td>
                  <StatusText value={doc.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {current && (
          <div className="fields" style={{ marginTop: 16 }}>
            <Field label="Editing">
              <input value={current.name} onChange={(event) => updateDoc({ name: event.target.value })} />
            </Field>
            <Field label="Maximum size (MB)">
              <input value={current.maxMb} onChange={(event) => updateDoc({ maxMb: Number(event.target.value) })} />
            </Field>
            <Field label="AI extraction">
              <select value={current.ai ? "Yes" : "No"} onChange={(event) => updateDoc({ ai: event.target.value === "Yes" })}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={current.status} onChange={(event) => updateDoc({ status: event.target.value as DocumentMaster["status"] })}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
          </div>
        )}
        <section className="form-section">
          <h2>Add a document type</h2>
          <div className="fields">
            <Field label="Name" required>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Category" required>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {state.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button
              onClick={() => {
                if (!name.trim()) return;
                const doc: DocumentMaster = {
                  id: uid("dm"),
                  code: `DOC-${state.counters.document + 1}`,
                  name,
                  categoryId,
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
                replace(saveDocument(state, doc, user));
                setName("");
              }}
            >
              Save document
            </Button>
          </div>
        </section>
        <h2 className="block-title">Lending Assistance rules</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Document</th>
              <th>Requirement</th>
              <th>Stage</th>
              <th>Customer upload</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.rules
              .filter((rule) => rule.service === "Lending Assistance")
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((rule) => {
                const doc = state.documents.find((item) => item.code === rule.documentCode);
                return (
                  <tr key={rule.id}>
                    <td>{doc?.name ?? rule.documentCode}</td>
                    <td>{rule.requirement}</td>
                    <td>{rule.stage}</td>
                    <td>{rule.customerUpload ? "Yes" : "No"}</td>
                    <td>{rule.status}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <Button
            variant="secondary"
            onClick={() => {
              const rule: ChecklistRule = {
                id: uid("rule"),
                service: "Lending Assistance",
                documentCode: current?.code ?? "DOC-CP",
                requirement: "Optional",
                stage: "collection",
                minFiles: 1,
                customerUpload: true,
                displayOrder: state.rules.length + 1,
                status: "Active",
              };
              replace(saveRule(state, rule, user));
            }}
          >
            Add optional rule for the selected document
          </Button>
        </div>
      </div>
    </Gate>
  );
}
