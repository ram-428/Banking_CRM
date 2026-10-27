"use client";

import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, Field, Gate, PageHeader, StatusText } from "@/components/ui";
import { can, isAdministrator } from "@/lib/access";
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
  Documents: "Document Master and Checklist Configuration",
  Audit: "The history of significant actions",
};

const SCOPE: Record<RoleConfig["scope"], string> = {
  Own: "Own",
  Assigned: "Assigned",
  Department: "Department",
  All: "All permitted records",
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
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleError, setRoleError] = useState("");
  const role = state?.roles.find((item) => item.id === roleId) ?? state?.roles.find((item) => item.name === user?.role) ?? state?.roles[0];

  useEffect(() => {
    if (!role) return;
    setRoleName(role.name);
    setRoleDescription(role.description);
  }, [role?.id, role?.name, role?.description]);

  if (!state || !user || !role) return null;
  const granted = MODULES.reduce((sum, module) => sum + PERM_KEYS.filter((key) => role.permissions[module][key]).length, 0);
  const total = MODULES.length * PERM_KEYS.length;

  function setFlags(module: ModuleKey, next: PermFlags) {
    if (!state || !user || !role) return;
    replace(updateRole(state, role.id, { permissions: { ...role.permissions, [module]: next } }, user));
  }

  function toggle(module: ModuleKey, key: keyof PermFlags) {
    if (!role) return;
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

  function commitName() {
    if (!state || !user || !role) return;
    const next = roleName.trim();
    if (!next) {
      setRoleError("Role name is required.");
      setRoleName(role.name);
      return;
    }
    if (next === role.name) return;
    if (state.roles.some((item) => item.id !== role.id && item.name.toLowerCase() === next.toLowerCase())) {
      setRoleError("A role with that name already exists.");
      setRoleName(role.name);
      return;
    }
    setRoleError("");
    const renamed = updateRole(state, role.id, { name: next }, user);
    replace({
      ...renamed,
      users: renamed.users.map((person) => (person.role === role.name ? { ...person, role: next } : person)),
    });
  }

  function commitDescription() {
    if (!state || !user || !role) return;
    const next = roleDescription.trim();
    if (next === role.description) return;
    replace(updateRole(state, role.id, { description: next }, user));
  }

  function toggleAll(module: ModuleKey) {
    if (!role) return;
    const on = PERM_KEYS.every((key) => role.permissions[module][key]);
    const next = { ...role.permissions[module] };
    for (const key of PERM_KEYS) next[key] = !on;
    setFlags(module, next);
  }

  if (!isAdministrator(state)) {
    return (
      <Gate module="Users">
        <div className="page">
          <PageHeader title="Role permissions" lede="Only Admin and Super Admin can configure roles and record scope." />
        </div>
      </Gate>
    );
  }

  return (
    <Gate module="Users">
      <div className="page">
        <PageHeader title="Role permissions" lede="Control access to modules and records. Checklist copies already on applications stay as they were." />
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
                  <span className="hint">{SCOPE[item.scope]}</span>
                </span>
                <StatusText value={item.status} />
              </button>
            ))}
          </section>
          <section className="perm-card">
            <p className="hint" style={{ marginTop: 0 }}>
              {granted} of {total} permissions granted
            </p>
            {roleError && <div className="banner banner-danger">{roleError}</div>}
            <div className="fields" style={{ marginBottom: 16 }}>
              <Field label="Role name" required>
                <input value={roleName} onChange={(event) => setRoleName(event.target.value)} onBlur={commitName} />
              </Field>
              <Field label="Status" required>
                <select value={role.status} onChange={(event) => replace(updateRole(state, role.id, { status: event.target.value as RoleConfig["status"] }, user))}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
              <Field label="Description" className="span-2">
                <textarea value={roleDescription} placeholder="Enter the description" onChange={(event) => setRoleDescription(event.target.value)} onBlur={commitDescription} />
              </Field>
              <Field label="Record scope" required hint="Own, assigned, department, or all permitted records.">
                <select value={role.scope} onChange={(event) => replace(updateRole(state, role.id, { scope: event.target.value as RoleConfig["scope"] }, user))}>
                  <option value="Own">Own</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Department">Department</option>
                  <option value="All">All permitted records</option>
                </select>
              </Field>
            </div>
            <div className="perm-scroll">
            <table className="perm">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>All</th>
                  {PERM_KEYS.map((key) => (
                    <th key={key}>{key[0].toUpperCase() + key.slice(1)}</th>
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
            <Field label="Role name" required>
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
