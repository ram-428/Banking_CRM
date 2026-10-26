"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, Field, Gate, PageHeader, StatusText } from "@/components/ui";
import { can } from "@/lib/access";
import { createRole, updateRole } from "@/lib/actions";
import { MODULES, PERM_KEYS } from "@/lib/constants";
import { useDesk } from "@/lib/store";
import type { ModuleKey, PermFlags, RoleConfig } from "@/lib/types";

const COPY: Record<ModuleKey, string> = {
  Leads: "Company profiles, contacts, and follow-ups",
  Applications: "Lending files from collection through closure",
  Verification: "Document review and approval",
  Financials: "Banking, VAT, and statement figures",
  Credit: "Eligibility and credit decisions",
  Banks: "Submissions, agreements, and delivery",
  Tasks: "Work assigned across the desk",
  Users: "Employee accounts and this role matrix",
  Documents: "Document master and checklist rules",
  Audit: "The history of significant actions",
};

export default function RolesPage() {
  const { state, replace, user } = useDesk();
  const [roleId, setRoleId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  if (!state || !user) return null;
  const role = state.roles.find((item) => item.id === roleId) ?? state.roles.find((item) => item.name === user.role) ?? state.roles[0];
  const granted = MODULES.reduce((sum, module) => sum + PERM_KEYS.filter((key) => role.permissions[module][key]).length, 0);
  const total = MODULES.length * PERM_KEYS.length;

  function setFlags(module: ModuleKey, next: PermFlags) {
    replace(updateRole(state!, role.id, { permissions: { ...role.permissions, [module]: next } }, user!));
  }

  function toggle(module: ModuleKey, key: keyof PermFlags) {
    setFlags(module, { ...role.permissions[module], [key]: !role.permissions[module][key] });
  }

  function closeAdd() {
    setAdding(false);
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    setError("");
  }

  function saveRole() {
    const result = createRole(state!, { name, slug, description }, user!);
    if (result.error || !result.id) {
      setError(result.error ?? "Could not save.");
      return;
    }
    replace(result.state);
    setRoleId(result.id);
    closeAdd();
  }

  function toggleAll(module: ModuleKey) {
    const on = PERM_KEYS.every((key) => role.permissions[module][key]);
    const next = { ...role.permissions[module] };
    for (const key of PERM_KEYS) next[key] = !on;
    setFlags(module, next);
  }

  return (
    <Gate module="Users">
      <div className="page">
        <PageHeader title="Role permissions" lede="Open a role to grant actions on its modules. Checklist copies already on applications stay as they were." />
        <div className="role-split">
          <section className="role-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Roles</h2>
                <p className="hint" style={{ marginBottom: 10 }}>
                  Select a role to grant permissions.
                </p>
              </div>
              {can(state, "Users", "create") && (
                <Button type="button" onClick={() => setAdding(true)}>
                  + Add role
                </Button>
              )}
            </div>
            {state.roles.map((item) => (
              <button key={item.id} type="button" className="role-item" aria-current={item.id === role.id ? "true" : undefined} onClick={() => setRoleId(item.id)}>
                <span>
                  <strong>
                    {item.name}
                    {item.name === user.role && <span className="you">You</span>}
                  </strong>
                  <span className="hint">{item.scope}</span>
                </span>
                <StatusText value={item.status} />
              </button>
            ))}
          </section>
          <section className="perm-card">
            <div className="page-head" style={{ marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 22, margin: 0 }}>{role.name}</h2>
                <p className="hint">
                  {granted} of {total} permissions granted
                </p>
              </div>
              <div className="fields" style={{ gridTemplateColumns: "140px 140px", margin: 0 }}>
                <label className="field">
                  <span>Record scope</span>
                  <select
                    value={role.scope}
                    onChange={(event) => replace(updateRole(state, role.id, { scope: event.target.value as RoleConfig["scope"] }, user))}
                  >
                    <option>Own</option>
                    <option>Assigned</option>
                    <option>Department</option>
                    <option>All</option>
                  </select>
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    value={role.status}
                    onChange={(event) => replace(updateRole(state, role.id, { status: event.target.value as RoleConfig["status"] }, user))}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="perm-scroll">
            <table className="perm">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>All</th>
                  {PERM_KEYS.map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((module) => {
                  const flags = role.permissions[module];
                  const allOn = PERM_KEYS.every((key) => flags[key]);
                  return (
                    <tr key={module}>
                      <td>
                        <strong>{module}</strong>
                        <div className="hint">{COPY[module]}</div>
                      </td>
                      <td>
                        <button className="switch" type="button" aria-pressed={allOn} aria-label={`${role.name} ${module} all`} onClick={() => toggleAll(module)} />
                      </td>
                      {PERM_KEYS.map((key) => (
                        <td key={key}>
                          <button
                            className="switch"
                            type="button"
                            aria-pressed={flags[key]}
                            aria-label={`${role.name} ${module} ${key}`}
                            onClick={() => toggle(module, key)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </section>
        </div>
        <FormDialog
          open={adding}
          title="Add role"
          description="Add a role. The slug is a stable identifier and cannot be changed later."
          submitLabel="Create role"
          onClose={closeAdd}
          onSubmit={saveRole}
        >
          {error && <div className="banner banner-danger">{error}</div>}
          <div className="fields">
            <Field label="Name" required>
              <input
                autoFocus
                placeholder="Enter the role name"
                value={name}
                onChange={(event) => {
                  const next = event.target.value;
                  setName(next);
                  if (!slugEdited) setSlug(next.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
                }}
              />
            </Field>
            <Field label="Slug" required hint="Lowercase letters, numbers and underscores. Locked after create.">
              <input
                placeholder="Enter the slug"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value);
                }}
              />
            </Field>
            <Field label="Description" className="span-2">
              <textarea placeholder="Enter the description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </Field>
          </div>
        </FormDialog>
      </div>
    </Gate>
  );
}
