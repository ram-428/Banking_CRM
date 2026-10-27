"use client";

import { useState } from "react";
import { Button, Field, Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { userName } from "@/lib/access";
import { saveTask } from "@/lib/actions";
import { STAGES } from "@/lib/constants";
import { formatDate, todayKey } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Task } from "@/lib/types";

const FILTERS = ["Today", "Upcoming", "Overdue", "Completed"] as const;

export default function TasksPage() {
  const { state, replace, user } = useDesk();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Today");
  const [name, setName] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [due, setDue] = useState("2026-10-28");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [stage, setStage] = useState<Task["stage"]>("Document Collection");
  const [error, setError] = useState("");

  if (!state || !user) return null;
  const today = todayKey();
  const rows = state.tasks.filter((task) => {
    if (user.role !== "Admin" && user.role !== "Management" && task.assigneeId !== user.id) return false;
    if (filter === "Completed") return task.status === "Completed";
    if (task.status === "Completed" || task.status === "Cancelled") return false;
    if (filter === "Today") return task.due <= today;
    if (filter === "Overdue") return task.due < today;
    return task.due > today;
  });

  function create() {
    if (!name.trim() || !applicationId || !due) {
      setError("Task name, application, and due date are required.");
      return;
    }
    const assignee = state!.users.find((item) => item.id === (assigneeId || user!.id));
    replace(
      saveTask(
        state!,
        {
          applicationId,
          name,
          stage,
          department: assignee?.department ?? user!.department,
          assigneeId: assignee?.id ?? user!.id,
          priority,
          due,
          status: "To Do",
        },
        user!,
      ),
    );
    setName("");
    setError("");
  }

  return (
    <Gate module="Tasks">
      <div className="page">
        <PageHeader title="My tasks" lede="Reassignment, due dates, and completion stay on the audit history." />
        <div className="tabs" role="tablist">
          {FILTERS.map((item) => (
            <button key={item} className="tab" type="button" aria-selected={filter === item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Task</th>
              <th>Application</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => {
              const app = state.applications.find((item) => item.id === task.applicationId);
              return (
                <tr key={task.id}>
                  <td>
                    {task.name}
                    <div className="hint">{task.stage}</div>
                  </td>
                  <td>{app?.number}</td>
                  <td>
                    <select
                      value={task.assigneeId}
                      aria-label={`Reassign ${task.name}`}
                      onChange={(event) => {
                        const assignee = state.users.find((item) => item.id === event.target.value);
                        replace(saveTask(state, { ...task, assigneeId: event.target.value, department: assignee?.department ?? task.department }, user));
                      }}
                    >
                      {state.users.filter((item) => item.status === "Active").map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      aria-label={`Due date for ${task.name}`}
                      value={task.due}
                      onChange={(event) => replace(saveTask(state, { ...task, due: event.target.value }, user))}
                    />
                  </td>
                  <td>{task.priority}</td>
                  <td>
                    <StatusText value={task.status} />
                    {task.status !== "Completed" && (
                      <div>
                        <button className="btn btn-ghost" type="button" onClick={() => replace(saveTask(state, { ...task, status: "Completed" }, user))}>
                          Complete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>No tasks in {filter.toLowerCase()}.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <section className="form-section">
          <h2>Assign a task</h2>
          {error && <div className="banner banner-danger">{error}</div>}
          <div className="fields">
            <Field label="Task name" required>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Application" required>
              <select value={applicationId} onChange={(event) => setApplicationId(event.target.value)}>
                <option value="">Select</option>
                {state.applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.number}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage" required>
              <select value={stage} onChange={(event) => setStage(event.target.value as Task["stage"])}>
                {STAGES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Assign to" required>
              <select value={assigneeId || user.id} onChange={(event) => setAssigneeId(event.target.value)}>
                {state.users.filter((item) => item.status === "Active").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority" required>
              <select value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </Field>
            <Field label="Due date" required>
              <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button onClick={create}>Assign task</Button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            Showing work for {user.role === "Admin" || user.role === "Management" ? "the whole desk" : userName(state, user.id)}.
          </p>
        </section>
      </div>
    </Gate>
  );
}
