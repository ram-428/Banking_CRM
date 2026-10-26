"use client";

import Link from "next/link";
import { can } from "@/lib/access";
import { formatDate, greeting, todayKey } from "@/lib/format";
import { isOverdue } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { ModuleKey } from "@/lib/types";

const STAGE_FOCUS = ["Document Collection", "Document Verification", "Credit Review", "Bank Processing", "Agreement", "Loan Delivery"] as const;

const ACTIONS: { href: string; label: string; module: ModuleKey; action?: "view" | "create" }[] = [
  { href: "/leads/new", label: "Create lead", module: "Leads", action: "create" },
  { href: "/applications/new", label: "New application", module: "Applications", action: "create" },
  { href: "/applications", label: "Applications", module: "Applications" },
  { href: "/verification", label: "Verification", module: "Verification" },
  { href: "/tasks", label: "My tasks", module: "Tasks" },
  { href: "/users", label: "Users", module: "Users" },
  { href: "/roles", label: "Roles", module: "Users" },
];

export default function DashboardPage() {
  const { state, user } = useDesk();
  if (!state || !user) return null;

  const mine = state.applications.filter((app) => {
    if (user.role === "Sales") return app.assignedTo === user.id && app.status !== "Closed";
    if (user.role === "Credit Analyst") return ["Credit Review", "Financial Profiling"].includes(app.currentStage) || app.status === "Credit Review";
    if (user.role === "Operations") return ["Document Verification", "Bank Submission", "Bank Processing", "Agreement", "Loan Delivery"].includes(app.currentStage);
    return app.status !== "Closed";
  });
  const overdue = state.applications.filter((app) => isOverdue(app) && (user.role === "Sales" ? app.assignedTo === user.id : true)).length;
  const myTasks = state.tasks.filter((task) => task.assigneeId === user.id && task.status !== "Completed" && task.status !== "Cancelled");
  const dueToday = myTasks.filter((task) => task.due <= todayKey()).length;
  const counts = STAGE_FOCUS.map((stage) => ({
    stage,
    count: state.applications.filter((app) => app.currentStage === stage).length,
  }));
  const stageTotal = counts.reduce((sum, item) => sum + item.count, 0) || 1;
  const actions = ACTIONS.filter((item) => can(state, item.module, item.action ?? "view")).slice(0, 6);
  const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="page">
      <section className="hero">
        <p className="hint">{longDate}</p>
        <h1>{greeting(user.name).split(",")[0]}, {user.name}</h1>
        <p className="lede">Snapshot for VR Worldwide. Figures follow your desk, and only the menus you can open.</p>
        <div className="pills">
          {actions.map((item) => (
            <Link key={item.href} className="pill" href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
      <div className="kpi-row">
        <Link className="kpi" href="/applications">
          <span className="kpi-ico" aria-hidden>
            <FileIcon />
          </span>
          <span>
            <span className="kpi-label">Open files</span>
            <strong>{mine.length}</strong>
            <span className="hint">
              {mine.length} in your queue, {overdue} overdue
            </span>
          </span>
        </Link>
        <Link className="kpi" href="/tasks">
          <span className="kpi-ico info" aria-hidden>
            <CheckIcon />
          </span>
          <span>
            <span className="kpi-label">Tasks</span>
            <strong>{myTasks.length}</strong>
            <span className="hint">
              {myTasks.length} open, {dueToday} due today or earlier
            </span>
          </span>
        </Link>
        <Link className="kpi" href={can(state, "Leads") ? "/leads" : "/applications"}>
          <span className="kpi-ico olive" aria-hidden>
            <PeopleIcon />
          </span>
          <span>
            <span className="kpi-label">Companies</span>
            <strong>{state.customers.length}</strong>
            <span className="hint">{state.customers.filter((item) => item.leadStatus !== "Converted").length} still in the lead list</span>
          </span>
        </Link>
      </div>
      <div className="split-cards">
        <section className="panel">
          <h2>Pipeline</h2>
          <p className="hint">Open applications by the stage they are in now.</p>
          <div className="dist">
            {counts.map((item) => (
              <div className="dist-row" key={item.stage}>
                <span>{item.stage}</span>
                <span className="hint">
                  {item.count} · {Math.round((item.count / stageTotal) * 100)}%
                </span>
                <div className="dist-track" aria-hidden>
                  <i style={{ width: `${(item.count / stageTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Due for you</h2>
          <p className="hint">Tasks assigned to {user.name.split(" ")[0]}.</p>
          <div className="dist">
            {myTasks.length === 0 && <p className="hint">No open tasks assigned to you.</p>}
            {myTasks.slice(0, 5).map((task) => {
              const app = state.applications.find((item) => item.id === task.applicationId);
              return (
                <div className="dist-row" key={task.id}>
                  <Link className="link" href="/tasks">
                    {task.name}
                  </Link>
                  <span className={task.due < todayKey() ? "tone-danger status" : "hint"}>{formatDate(task.due)}</span>
                  <div className="hint">
                    {app?.number} · {task.status}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    </svg>
  );
}
