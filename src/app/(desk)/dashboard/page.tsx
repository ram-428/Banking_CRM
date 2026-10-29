"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { can, isAdministrator, userName } from "@/lib/access";
import { APP_STATUSES, STAGES } from "@/lib/constants";
import { aed, formatDate, formatWhen, greeting, todayKey } from "@/lib/format";
import { deliveredTotal, isOverdue } from "@/lib/metrics";
import { parentRequestStatus } from "@/lib/request-status";
import { useDesk } from "@/lib/store";
import type { ModuleKey } from "@/lib/types";

const ACTIONS: { href: string; label: string; module: ModuleKey; action?: "view" | "create" }[] = [
  { href: "/leads/new", label: "Create lead", module: "Leads", action: "create" },
  { href: "/applications/new", label: "New application", module: "Applications", action: "create" },
  { href: "/applications", label: "Application list", module: "Applications" },
  { href: "/verification", label: "Verification", module: "Verification" },
  { href: "/tasks", label: "My tasks", module: "Tasks" },
  { href: "/users", label: "User list", module: "Users" },
  { href: "/roles", label: "Role permissions", module: "Users" },
];

const MONTHS = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

export default function DashboardPage() {
  const { state, user } = useDesk();
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const figures = useMemo(() => {
    if (!state || !user) return null;
    const inRange = (value?: string) => {
      if (!value) return !from && !to;
      const day = value.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    };
    const apps = state.applications.filter((app) => {
      if (user.role === "Sales" && app.assignedTo !== user.id) return false;
      if (status !== "All" && app.status !== status) return false;
      return inRange(app.date);
    });
    const appIds = new Set(apps.map((app) => app.id));
    const customers = state.customers.filter((item) => {
      if (user.role === "Sales" && item.assignedTo !== user.id) return false;
      return inRange(item.createdAt);
    });
    const leads = customers.filter((item) => item.leadStatus !== "Converted" && item.leadStatus !== "Lost");
    const active = apps.filter((app) => !["Closed", "Rejected", "Withdrawn"].includes(app.status));
    const credit = apps.filter((app) => app.status === "Credit Review" || app.currentStage === "Credit Review");
    const submitted = apps.filter((app) => app.status === "Submitted to Bank" || app.status === "Bank Processing");
    const approved = apps.filter((app) => app.status === "Approved" || app.status === "Disbursed");
    const pendingDocs = state.checklist.filter((item) => appIds.has(item.applicationId) && item.requiredNow && item.status !== "Approved");
    const tasks = state.tasks.filter((task) => {
      if (user.role === "Sales" && task.assigneeId !== user.id) return false;
      return inRange(task.due);
    });
    const overdueTasks = tasks.filter((task) => task.status !== "Completed" && task.status !== "Cancelled" && task.due < todayKey());
    const myTasks = state.tasks.filter((task) => task.assigneeId === user.id && task.status !== "Completed" && task.status !== "Cancelled");
    const disbursed = apps.reduce((sum, app) => sum + deliveredTotal(state, app.id), 0);
    const stageCounts = STAGES.map((stage) => ({ stage, count: apps.filter((app) => app.currentStage === stage).length }));
    const statusCounts = APP_STATUSES.map((item) => ({ status: item, count: apps.filter((app) => app.status === item).length })).filter((item) => item.count > 0);
    const monthCounts = MONTHS.map((month) => ({
      month,
      count: apps.filter((app) => app.date.startsWith(month)).length,
    }));
    const submissions = state.submissions.filter((item) => appIds.has(item.applicationId));
    const bankCounts = ["Draft", "Submitted", "Under Bank Review", "Additional Documents Required", "Approved", "Rejected", "Withdrawn"]
      .map((item) => ({ status: item, count: submissions.filter((row) => row.status === item).length }))
      .filter((item) => item.count > 0);
    const awaiting = state.versions.filter((item) => item.status === "Awaiting Review" && appIds.has(item.applicationId));
    const overdueApps = apps.filter((app) => isOverdue(app));
    const activity = state.audit.filter((item) => inRange(item.at)).slice(0, 6);
    return { customers, leads, active, credit, submitted, approved, pendingDocs, overdueTasks, myTasks, disbursed, stageCounts, statusCounts, monthCounts, bankCounts, awaiting, overdueApps, activity, apps };
  }, [state, user, status, from, to]);

  if (!state || !user || !figures) return null;
  const today = todayKey();
  const serviceRequests = state.serviceRequests.filter((request) => {
    if (user.role === "Admin" || user.role === "Management") return true;
    const owned = state.serviceInstances.filter((item) => item.requestId === request.id);
    return request.assigneeId === user.id || owned.some((item) => item.assigneeId === user.id);
  });
  const serviceInstances = state.serviceInstances.filter((item) => serviceRequests.some((request) => request.id === item.requestId));
  const serviceFigures = {
    requests: serviceRequests,
    inProgress: serviceRequests.filter((request) => {
      const status = parentRequestStatus(serviceInstances.filter((item) => item.requestId === request.id));
      return status === "Draft" || status === "In Progress" || status === "On Hold";
    }).length,
    held: serviceInstances.filter((item) => item.status === "On Hold").length,
    assessments: serviceInstances.filter((item) => item.assessmentRequired && item.assessmentStatus !== "Finalized" && item.status !== "Rejected" && item.status !== "Cancelled").length,
    overdue: state.serviceActivities.filter((item) => {
      const visible = user.role === "Admin" || user.role === "Management" || item.assigneeId === user.id;
      return visible && Boolean(item.due && item.due < today && item.status !== "Completed" && item.status !== "Cancelled");
    }).length,
    documents: serviceInstances.reduce((sum, item) => sum + item.checklist.filter((row) => row.requirement === "Mandatory" && row.status !== "Approved").length, 0),
  };
  const actions = ACTIONS.filter((item) => {
    if (item.href === "/roles" && !isAdministrator(state)) return false;
    return can(state, item.module, item.action ?? "view");
  }).slice(0, 6);
  const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const stageMax = Math.max(1, ...figures.stageCounts.map((item) => item.count));
  const monthMax = Math.max(1, ...figures.monthCounts.map((item) => item.count));
  const statusMax = Math.max(1, ...figures.statusCounts.map((item) => item.count));
  const bankMax = Math.max(1, ...figures.bankCounts.map((item) => item.count));

  return (
    <div className="page">
      <section className="hero">
        <p className="hint">{longDate}</p>
        <h1>{`${greeting(user.name).split(",")[0]}, ${user.name}`}</h1>
        <p className="lede">Management snapshot for VR Worldwide Banking CRM. Every figure comes from the same demo records.</p>
        <div className="pills">
          {actions.map((item) => (
            <Link key={item.href} className="pill" href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
      <div className="filters">
        <select aria-label="Application status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>All</option>
          {APP_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      <div className="kpi-row">
        <Card href="/leads" label="Total customers" value={String(figures.customers.length)} hint="Companies on the desk" />
        <Card href="/leads" label="Total leads" value={String(figures.leads.length)} hint="Open, not converted or lost" tone="olive" />
        <Card href="/applications" label="Active applications" value={String(figures.active.length)} hint="Still moving through the file" />
        <Card href="/applications" label="Credit review" value={String(figures.credit.length)} hint="Waiting on a credit decision" tone="info" />
        <Card href="/applications" label="Submitted to banks" value={String(figures.submitted.length)} hint="Overall status, not one bank" />
        <Card href="/verification" label="Pending documents" value={String(figures.pendingDocs.length)} hint="Required items still short of approval" />
        <Card href="/tasks" label="Overdue tasks" value={String(figures.overdueTasks.length)} hint="Due before today" tone="info" />
        <Card href="/applications" label="Approved applications" value={String(figures.approved.length)} hint="Approved or already disbursed" tone="olive" />
        <Card href="/applications" label="Total disbursed" value={aed(figures.disbursed)} hint="Sum of delivery records" money />
      </div>
      <h2 className="block-title">Service requests</h2>
      <div className="kpi-row">
        <Card href="/service-requests" label="Service requests" value={String(serviceFigures.requests.length)} hint="Parent requests in this desk" />
        <Card href="/service-requests" label="In progress" value={String(serviceFigures.inProgress)} hint="Parent status is still open" />
        <Card href="/service-requests" label="Services on hold" value={String(serviceFigures.held)} hint="One service on hold does not stop the others" tone="info" />
        <Card href="/service-requests" label="Assessments open" value={String(serviceFigures.assessments)} hint="Required assessments not yet finalized" />
        <Card href="/work-queue" label="Overdue activities" value={String(serviceFigures.overdue)} hint="Due date has passed and the activity is still open" tone="info" />
        <Card href="/service-requests" label="Documents outstanding" value={String(serviceFigures.documents)} hint="Mandatory items not approved" />
      </div>
      <div className="split-cards">
        <section className="panel">
          <h2>Applications by stage</h2>
          <p className="hint">Current stage on each file in this filter.</p>
          <Bars rows={figures.stageCounts.map((item) => ({ label: item.stage, count: item.count }))} max={stageMax} />
        </section>
        <section className="panel">
          <h2>Status distribution</h2>
          <p className="hint">Overall application status.</p>
          <Bars rows={figures.statusCounts.map((item) => ({ label: item.status, count: item.count }))} max={statusMax} />
        </section>
      </div>
      <div className="split-cards">
        <section className="panel">
          <h2>Monthly application trends</h2>
          <p className="hint">Files opened from May through October 2026.</p>
          <div className="trend">
            {figures.monthCounts.map((item) => (
              <div key={item.month}>
                <div className="trend-col" title={`${item.count}`}>
                  <i style={{ height: `${Math.max(8, (item.count / monthMax) * 100)}%` }} />
                </div>
                <span>{item.month.slice(5)}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Bank submission summary</h2>
          <p className="hint">Each bank keeps its own status.</p>
          {figures.bankCounts.length === 0 && <p className="hint">No submissions in this filter.</p>}
          <Bars rows={figures.bankCounts.map((item) => ({ label: item.status, count: item.count }))} max={bankMax} />
        </section>
      </div>
      <section className="panel" style={{ marginBottom: 14 }}>
        <h2>Workflow</h2>
        <p className="hint">Lead qualification through closure. A card is one application.</p>
        <div className="board">
          {STAGES.map((stage) => {
            const rows = figures.apps.filter((app) => app.currentStage === stage);
            return (
              <div className="board-col" key={stage}>
                <strong>
                  {stage} <span className="hint">{rows.length}</span>
                </strong>
                {rows.map((app) => {
                  const customer = state.customers.find((item) => item.id === app.customerId);
                  return (
                    <Link className="board-card" key={app.id} href={`/applications/${app.id}`}>
                      <b>{app.number}</b>
                      <span>{customer?.name}</span>
                      <span className="hint">{app.status}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
      <div className="split-cards">
        <section className="panel">
          <h2>Recent activity</h2>
          <p className="hint">Demo history. These entries are not sent to an external system.</p>
          <div className="dist">
            {figures.activity.length === 0 && <p className="hint">No activity in this range.</p>}
            {figures.activity.map((item) => (
              <div className="dist-row" key={item.id}>
                <span>
                  {item.action} · {item.module}
                  <div className="hint">{item.record}</div>
                </span>
                <span className="hint">
                  {userName(state, item.actorId)}
                  <br />
                  {formatWhen(item.at)}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>My tasks</h2>
          <p className="hint">{`Assigned to ${user.name.split(" ")[0]}.`}</p>
          <div className="dist">
            {figures.myTasks.length === 0 && <p className="hint">No open tasks assigned to you.</p>}
            {figures.myTasks.slice(0, 5).map((task) => (
              <div className="dist-row" key={task.id}>
                <Link className="link" href="/tasks">
                  {task.name}
                </Link>
                <span className={task.due < todayKey() ? "tone-danger status" : "hint"}>{formatDate(task.due)}</span>
              </div>
            ))}
          </div>
          <h2 style={{ marginTop: 18 }}>Pending verification</h2>
          <div className="dist">
            {figures.awaiting.length === 0 && <p className="hint">Nothing is waiting for review.</p>}
            {figures.awaiting.slice(0, 4).map((item) => (
              <div className="dist-row" key={item.id}>
                <Link className="link" href={`/verification/${item.id}`}>
                  {item.fileName}
                </Link>
                <span className="hint">{formatDate(item.uploadedAt)}</span>
              </div>
            ))}
          </div>
          <h2 style={{ marginTop: 18 }}>Overdue stages</h2>
          <div className="dist">
            {figures.overdueApps.length === 0 && <p className="hint">No stage is past its expected completion.</p>}
            {figures.overdueApps.slice(0, 4).map((app) => (
              <div className="dist-row" key={app.id}>
                <Link className="link" href={`/applications/${app.id}`}>
                  {app.number}
                </Link>
                <span className="tone-danger status">{app.currentStage}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ href, label, value, hint, tone, money }: { href: string; label: string; value: string; hint: string; tone?: "info" | "olive"; money?: boolean }) {
  return (
    <Link className="kpi" href={href}>
      <span className={tone ? `kpi-ico ${tone}` : "kpi-ico"} aria-hidden>
        <Dot />
      </span>
      <span>
        <span className="kpi-label">{label}</span>
        <strong className={money ? "money" : undefined}>{value}</strong>
        <span className="hint">{hint}</span>
      </span>
    </Link>
  );
}

function Bars({ rows, max }: { rows: { label: string; count: number }[]; max: number }) {
  if (rows.length === 0) return <p className="hint">Nothing in this filter.</p>;
  return (
    <div className="dist">
      {rows.map((item) => (
        <div className="dist-row" key={item.label}>
          <span>{item.label}</span>
          <span className="hint">{item.count}</span>
          <div className="dist-track" aria-hidden>
            <i style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Dot() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}
