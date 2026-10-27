"use client";

import { useMemo, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, Field, Gate, PageHeader, RowAction, StatusText, DataTable } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { resetAccess, saveUser, setUserStatus } from "@/lib/actions";
import { useDesk } from "@/lib/store";
import type { Department, User } from "@/lib/types";

type Draft = {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  employeeCode: string;
  department: Department;
  role: string;
  managerId: string;
  status: User["status"];
};

const empty: Draft = {
  name: "",
  email: "",
  mobile: "",
  employeeCode: "",
  department: "Sales",
  role: "Sales",
  managerId: "",
  status: "Active",
};

function fromUser(person: User): Draft {
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    mobile: person.mobile,
    employeeCode: person.employeeCode ?? "",
    department: person.department,
    role: person.role,
    managerId: person.managerId ?? "",
    status: person.status,
  };
}

export default function UsersPage() {
  const { state, replace, user } = useDesk();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [role, setRole] = useState("All roles");
  const [mode, setMode] = useState<"create" | "edit" | "view" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.users.filter((person) => {
      const blob = `${person.id} ${person.name} ${person.email} ${person.mobile} ${person.employeeCode ?? ""}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (status !== "All statuses" && person.status !== status) return false;
      if (role !== "All roles" && person.role !== role) return false;
      return true;
    });
  }, [state, q, status, role]);

  if (!state || !user) return null;
  const roles = [...new Set([...state.roles.map((item) => item.name), ...state.users.map((person) => person.role)])];
  const canEdit = can(state, "Users", "edit");
  const viewing = mode === "view";

  function close() {
    setMode(null);
    setDraft(empty);
    setError("");
  }

  function open(next: "create" | "edit" | "view", person?: User) {
    setError("");
    setNotice("");
    setDraft(person ? fromUser(person) : { ...empty, role: state?.roles[0]?.name ?? "Sales" });
    setMode(next);
  }

  function save() {
    if (!state || !user || viewing) return;
    if (!draft.name.trim() || !draft.email.includes("@") || !draft.mobile.trim() || !draft.department || !draft.role || !draft.status) {
      setError("Full name, a unique email, mobile, department, role, and status are required.");
      return;
    }
    const result = saveUser(
      state,
      {
        id: draft.id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        mobile: draft.mobile.trim(),
        employeeCode: draft.employeeCode.trim() || undefined,
        department: draft.department,
        role: draft.role,
        managerId: draft.managerId || undefined,
        status: draft.status,
        password: draft.id ? state.users.find((item) => item.id === draft.id)?.password ?? "welcome" : "welcome",
      },
      user,
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    replace(result.state);
    close();
  }

  function deactivate(person: User) {
    if (!state || !user) return;
    if (person.id === user.id) {
      setNotice("You cannot deactivate the account you are signed in with.");
      return;
    }
    const next = person.status === "Active" ? "Inactive" : "Active";
    replace(setUserStatus(state, person.id, next, user));
    setNotice(next === "Inactive" ? `${person.name} is inactive.` : `${person.name} is active again.`);
  }

  function reset(person: User) {
    if (!state || !user) return;
    replace(resetAccess(state, person.id, user));
    setNotice(`Access reset. ${person.name} can sign in with welcome.`);
  }

  return (
    <Gate module="Users">
      <div className="page">
        <PageHeader title="User list" lede="Search and maintain employee accounts." />
        {notice && <div className="banner banner-ok">{notice}</div>}
        <div className="filters">
          <input aria-label="Search users" placeholder="Search name, email, mobile, or code" value={q} onChange={(event) => setQ(event.target.value)} />
          <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option>All roles</option>
            {roles.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {can(state, "Users", "create") && (
            <Button type="button" className="push" onClick={() => open("create")}>
              + Add user
            </Button>
          )}
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Full name</th>
              <th>Email address</th>
              <th>Mobile number</th>
              <th>Employee code</th>
              <th>Department</th>
              <th>Role</th>
              <th>Reporting manager</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((person) => (
              <tr key={person.id}>
                <td>{person.id}</td>
                <td>{person.name}</td>
                <td>{person.email}</td>
                <td>{person.mobile}</td>
                <td>{person.employeeCode || "None"}</td>
                <td>{person.department}</td>
                <td>{person.role}</td>
                <td>{person.managerId ? userName(state, person.managerId) : "None"}</td>
                <td>
                  <StatusText value={person.status} />
                </td>
                <td>
                  <div className="row-actions">
                    <RowAction icon="view" label="View" onClick={() => open("view", person)} />
                    {canEdit && <RowAction icon="edit" label="Edit" onClick={() => open("edit", person)} />}
                    {canEdit && (
                      <RowAction
                        icon={person.status === "Active" ? "off" : "on"}
                        label={person.status === "Active" ? "Deactivate" : "Activate"}
                        disabled={person.id === user.id && person.status === "Active"}
                        onClick={() => deactivate(person)}
                      />
                    )}
                    {canEdit && <RowAction icon="reset" label="Reset access" onClick={() => reset(person)} />}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>No users match these filters.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <div className="list-foot">
          Showing {rows.length === 0 ? "0" : `1–${rows.length}`} of {state.users.length}
        </div>
        <FormDialog
          open={mode !== null}
          wide
          readOnly={viewing}
          title={mode === "edit" ? "Edit user" : mode === "view" ? "View user" : "Add user"}
          description={viewing ? "Employee account details." : "Create or update an employee account. Email addresses must stay unique."}
          submitLabel={mode === "edit" ? "Save user" : "Create user"}
          onClose={close}
          onSubmit={save}
        >
          {error && <div className="banner banner-danger">{error}</div>}
          <div className="fields">
            {draft.id && (
              <Field label="User ID" hint="Assigned by the system and cannot be changed.">
                <input value={draft.id} readOnly />
              </Field>
            )}
            <Field label="Full name" required>
              <input autoFocus={!viewing} placeholder="Enter the full name" value={draft.name} disabled={viewing} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Email address" required>
              <input type="email" placeholder="Enter the email" value={draft.email} disabled={viewing} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </Field>
            <Field label="Mobile number" required>
              <input placeholder="Enter the mobile number" value={draft.mobile} disabled={viewing} onChange={(event) => setDraft({ ...draft, mobile: event.target.value })} />
            </Field>
            <Field label="Employee code">
              <input placeholder="Enter the employee code" value={draft.employeeCode} disabled={viewing} onChange={(event) => setDraft({ ...draft, employeeCode: event.target.value })} />
            </Field>
            <Field label="Department" required>
              <select value={draft.department} disabled={viewing} onChange={(event) => setDraft({ ...draft, department: event.target.value as Department })}>
                <option>Sales</option>
                <option>Credit</option>
                <option>Operations</option>
                <option>Administration</option>
                <option>Management</option>
              </select>
            </Field>
            <Field label="Role" required>
              <select value={draft.role} disabled={viewing} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>
                {state.roles.map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Reporting manager">
              <select value={draft.managerId} disabled={viewing} onChange={(event) => setDraft({ ...draft, managerId: event.target.value })}>
                <option value="">None</option>
                {state.users
                  .filter((person) => person.id !== draft.id)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Status" required>
              <select value={draft.status} disabled={viewing} onChange={(event) => setDraft({ ...draft, status: event.target.value as User["status"] })}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
          </div>
        </FormDialog>
      </div>
    </Gate>
  );
}
