export function aed(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "None";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string) {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatWhen(value?: string) {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(from?: string, to = new Date()) {
  if (!from) return 0;
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.floor((to.getTime() - start.getTime()) / 86400000);
}

export function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0]}`;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

export function toneFor(status: string) {
  const value = status.toLowerCase();
  if (["approved", "completed", "eligible", "active", "disbursed", "closed", "finalized", "passed", "match", "signed"].some((k) => value.includes(k)) && !value.includes("partial")) {
    return "olive";
  }
  if (value.includes("partial")) return "info";
  if (["reject", "declin", "fail", "lost", "mismatch", "overdue", "expired", "inactive", "cancel"].some((k) => value.includes(k))) {
    return "danger";
  }
  if (["await", "pending", "review", "progress", "submitted", "flag", "hold", "required", "draft", "sent", "viewed", "qualified", "uploaded"].some((k) => value.includes(k))) {
    return "amber";
  }
  if (["new", "ready", "open"].some((k) => value === k)) return "accent";
  return "muted";
}

export function fileAllowed(name: string, types: string[]) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return types.map((t) => t.toLowerCase().replace(".", "")).includes(ext);
}
