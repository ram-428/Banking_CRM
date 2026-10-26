"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Gate, PageHeader } from "@/components/ui";
import { saveUser } from "@/lib/actions";
import { useDesk } from "@/lib/store";
import type { Department, UserRole } from "@/lib/types";

export default function NewUserPage() {
  const { state, replace, user } = useDesk();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState<Department>("Sales");
  const [role, setRole] = useState<UserRole>("Sales");
  const [managerId, setManagerId] = useState("");
  const [error, setError] = useState("");

  if (!state || !user) return null;

  function save() {
    if (!name.trim() || !email.includes("@") || !mobile.trim()) {
      setError("Name, a unique email, and mobile are required.");
      return;
    }
    const result = saveUser(
      state!,
      { name, email, mobile, employeeCode, department, role, managerId: managerId || undefined, status: "Active", password: "welcome" },
      user!,
    );
    if (result.error || !result.id) {
      setError(result.error ?? "Could not save.");
      return;
    }
    replace(result.state);
    router.push(`/users/${result.id}`);
  }

  return (
    <Gate module="Users">
      <div className="page">
        <PageHeader crumbs={[{ href: "/users", label: "Users" }, { label: "Create" }]} title="Create user" lede="The preview password is welcome until access is reset." />
        {error && <div className="banner banner-danger">{error}</div>}
        <div className="fields">
          <Field label="Full name" required>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email address" required>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Mobile number" required>
            <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
          </Field>
          <Field label="Employee code">
            <input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} />
          </Field>
          <Field label="Department" required>
            <select value={department} onChange={(event) => setDepartment(event.target.value as Department)}>
              <option>Sales</option>
              <option>Credit</option>
              <option>Operations</option>
              <option>Administration</option>
              <option>Management</option>
            </select>
          </Field>
          <Field label="Role" required>
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              {state.roles.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Reporting manager">
            <select value={managerId} onChange={(event) => setManagerId(event.target.value)}>
              <option value="">None</option>
              {state.users.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button onClick={save}>Save user</Button>
        </div>
      </div>
    </Gate>
  );
}
