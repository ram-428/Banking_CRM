"use client";

import Link from "next/link";
import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, Field, Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { can, userName } from "@/lib/access";
import { saveTask } from "@/lib/actions";
import { STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Department, Task } from "@/lib/types";

const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
const DEPARTMENTS: Department[] = ["Sales", "Credit", "Operations", "Administration", "Management"];
const STATUSES: Task["status"][] = ["To Do", "In Progress", "Waiting for Customer", "Waiting for Bank", "On Hold", "Completed", "Cancelled"];

type Draft = {
  name: string;
  description: string;
  applicationId: string;
  stage: Task["stage"];
  department: Department | "";
  assigneeId: string;
  priority: Task["priority"];
  due: string;
  status: Task["status"];
  remarks: string;
};

function blank(): Draft {
  return {
    name: "",
    description: "",
    applicationId: "",
    stage: "Document Collection",
    department: "",
    assigneeId: "",
    priority: "Medium",
    due: "2026-10-30",
    status: "To Do",
    remarks: "",
  };
}

export default function TaskAssignmentPage() {
  const { state, replace, user } = useDesk();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!state || !user) return null;

  function close() {
    setOpen(false);
    setError("");
    setDraft(blank());
  }

  function create() {
    if (!draft.name.trim() || !draft.applicationId || !draft.assigneeId || !draft.due || !draft.department) {
      setError("Task name, application, department, assignee, and due date are required.");
      return;
    }
    replace(
      saveTask(
        state!,
        {
          applicationId: draft.applicationId,
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          stage: draft.stage,
          department: draft.department,
          assigneeId: draft.assigneeId,
          priority: draft.priority,
          due: draft.due,
          status: draft.status,
          remarks: draft.remarks.trim() || undefined,
        },
        user!,
      ),
    );
    setNotice(`${draft.name.trim()} is assigned.`);
    close();
  }

  return (
    <Gate module="Tasks">
      <div className="page">
        <PageHeader
          title="Task assignment"
          lede="Assign a stage task to a department and an employee. My tasks shows the work waiting on you."
          actions={
            can(state, "Tasks", "create") ? (
              <Button type="button" onClick={() => setOpen(true)}>
                + Add task
              </Button>
            ) : undefined
          }
        />
        {notice && <div className="banner banner-ok">{notice}</div>}
        <DataTable>
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Task</th>
              <th>Application</th>
              <th>Stage</th>
              <th>Department</th>
              <th>Assigned to</th>
              <th>Priority</th>
              <th>Assigned</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.tasks.map((task) => {
              const app = state.applications.find((item) => item.id === task.applicationId);
              return (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>
                    {task.name}
                    <div className="hint">{task.description || task.remarks || "No description"}</div>
                  </td>
                  <td>
                    <Link className="link" href={`/applications/${task.applicationId}`}>
                      {app?.number ?? task.applicationId}
                    </Link>
                  </td>
                  <td>{task.stage}</td>
                  <td>{task.department}</td>
                  <td>{userName(state, task.assigneeId)}</td>
                  <td>{task.priority}</td>
                  <td>{formatDate(task.assignedAt)}</td>
                  <td>{formatDate(task.due)}</td>
                  <td>
                    <StatusText value={task.status} />
                  </td>
                </tr>
              );
            })}
            {state.tasks.length === 0 && (
              <tr>
                <td colSpan={10}>No tasks assigned yet.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <FormDialog open={open} wide title="Add task" description="Fill the task, then assign it to an employee on the application." submitLabel="Assign task" onClose={close} onSubmit={create}>
          {error && <div className="banner banner-danger">{error}</div>}
          <div className="fields">
            <Field label="Task name" required>
              <input autoFocus placeholder="Enter the task name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Application" required>
              <select
                value={draft.applicationId}
                onChange={(event) => {
                  const applicationId = event.target.value;
                  const app = state.applications.find((item) => item.id === applicationId);
                  setDraft({ ...draft, applicationId, stage: app?.currentStage ?? draft.stage });
                }}
              >
                <option value="">Select an application</option>
                {state.applications.map((app) => {
                  const customer = state.customers.find((item) => item.id === app.customerId);
                  return (
                    <option key={app.id} value={app.id}>
                      {app.number} · {customer?.name ?? "Company"}
                    </option>
                  );
                })}
              </select>
            </Field>
            <Field label="Stage" required>
              <select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as Task["stage"] })}>
                {STAGES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Department" required>
              <select value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value as Department })}>
                <option value="">Select a department</option>
                {DEPARTMENTS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Assign to" required>
              <select
                value={draft.assigneeId}
                onChange={(event) => {
                  const assigneeId = event.target.value;
                  const assignee = state.users.find((item) => item.id === assigneeId);
                  setDraft({ ...draft, assigneeId, department: assignee?.department ?? draft.department });
                }}
              >
                <option value="">Select an employee</option>
                {state.users
                  .filter((person) => person.status === "Active")
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} · {person.department}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Priority" required>
              <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Task["priority"] })}>
                {PRIORITIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Due date" required>
              <input type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} />
            </Field>
            <Field label="Status" required>
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Task["status"] })}>
                {STATUSES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Description" className="span-2">
              <textarea placeholder="What needs to be done" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </Field>
            <Field label="Remarks" className="span-2">
              <textarea placeholder="Notes for the assignee" value={draft.remarks} onChange={(event) => setDraft({ ...draft, remarks: event.target.value })} />
            </Field>
          </div>
        </FormDialog>
      </div>
    </Gate>
  );
}
