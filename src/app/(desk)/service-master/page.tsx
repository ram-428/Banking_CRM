"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, DataTable, Field, Gate, PageHeader, RowAction, StatusText } from "@/components/ui";
import { can } from "@/lib/access";
import { saveServiceDefinition } from "@/lib/actions";
import { useDesk } from "@/lib/store";
import type { ServiceDefinition } from "@/lib/types";

const blank = { name: "", status: "Active" as const, financialAssessment: false, documentCodes: [] as string[] };

export default function ServiceMasterPage() {
  const { state, replace, user } = useDesk();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<ServiceDefinition, "id"> & { id?: string }>(blank);
  const [error, setError] = useState("");

  if (!state || !user) return null;
  const activeDocuments = state.documents.filter((item) => item.status === "Active");
  const selectedCount = activeDocuments.filter((item) => draft.documentCodes.includes(item.code)).length;

  function setAll(selected: boolean) {
    setDraft((current) => ({
      ...current,
      documentCodes: selected
        ? Array.from(new Set([...current.documentCodes, ...activeDocuments.map((item) => item.code)]))
        : current.documentCodes.filter((code) => !activeDocuments.some((item) => item.code === code)),
    }));
  }

  function edit(service?: ServiceDefinition) {
    setError("");
    setDraft(service ? { ...service } : blank);
    setOpen(true);
  }

  function toggle(code: string) {
    setDraft((current) => ({
      ...current,
      documentCodes: current.documentCodes.includes(code) ? current.documentCodes.filter((item) => item !== code) : [...current.documentCodes, code],
    }));
  }

  function save() {
    const result = saveServiceDefinition(state!, draft, user!);
    if (result.error) {
      setError(result.error);
      return;
    }
    replace(result.state);
    setOpen(false);
  }

  return (
    <Gate module="Documents">
      <div className="page">
        <PageHeader
          title="Service master"
          lede="A service name, its active state, whether financial assessment applies, and the documents copied onto each new service instance."
          actions={can(state, "Documents", "create") ? <Button type="button" onClick={() => edit()}>+ Add service</Button> : undefined}
        />
        <DataTable>
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Financial assessment</th>
              <th>Checklist</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.services.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>
                  <StatusText value={service.status} />
                </td>
                <td>{service.financialAssessment ? "Required" : "Not applicable"}</td>
                <td>{service.documentCodes.join(", ")}</td>
                <td>
                  {can(state, "Documents", "edit") && <RowAction icon="edit" label="Edit" onClick={() => edit(service)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <FormDialog open={open} title={draft.id ? "Edit service" : "Add service"} submitLabel="Save service" wide onClose={() => setOpen(false)} onSubmit={save}>
          <div className="fields">
            <Field label="Service name" required error={error}>
              <input value={draft.name} maxLength={150} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Status" required>
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ServiceDefinition["status"] })}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
            <Field label="Financial assessment">
              <select value={draft.financialAssessment ? "yes" : "no"} onChange={(event) => setDraft({ ...draft, financialAssessment: event.target.value === "yes" })}>
                <option value="no">Not applicable</option>
                <option value="yes">Required</option>
              </select>
            </Field>
          </div>
          <div className="check-toolbar">
            <div className="check-toolbar-title">
              <strong>Checklist documents</strong>
              <span className="hint">{selectedCount} of {activeDocuments.length} selected</span>
            </div>
            <div className="row-actions">
              <Button type="button" variant="secondary" disabled={selectedCount === activeDocuments.length} onClick={() => setAll(true)}>Select all</Button>
              <Button type="button" variant="secondary" disabled={selectedCount === 0} onClick={() => setAll(false)}>Deselect all</Button>
            </div>
          </div>
          <div className="fields" style={{ marginTop: 8 }}>
            {activeDocuments.map((document) => (
              <label key={document.code} className="field">
                <span>
                  <input type="checkbox" checked={draft.documentCodes.includes(document.code)} onChange={() => toggle(document.code)} /> {document.name}
                </span>
                <small className="hint">{document.code}</small>
              </label>
            ))}
          </div>
        </FormDialog>
      </div>
    </Gate>
  );
}
