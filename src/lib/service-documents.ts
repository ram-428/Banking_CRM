import type { ServiceChecklistItem, ServiceDocStatus, ServiceFile } from "./types";

export const MAX_PREVIEW_BYTES = 700 * 1024;

export function isPeriodBased(code: string) {
  return code === "DOC-BS";
}

export function requiredFiles(item: Pick<ServiceChecklistItem, "minFiles">) {
  return item.minFiles && item.minFiles > 0 ? item.minFiles : 1;
}

function monthIndex(value: string) {
  const [year, month] = value.split("-").map(Number);
  return year * 12 + (month - 1);
}

export function monthLabel(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function isExpiredFile(file: Pick<ServiceFile, "status" | "expiryDate">, today: string) {
  return file.status === "Expired" || Boolean(file.status === "Approved" && file.expiryDate && file.expiryDate < today);
}

export function validFiles(item: ServiceChecklistItem, today: string) {
  return (item.files ?? []).filter((file) => file.status === "Approved" && !isExpiredFile(file, today));
}

export function liveFiles(item: ServiceChecklistItem) {
  return (item.files ?? []).filter((file) => file.status === "Uploaded" || file.status === "Approved");
}

/** Months covered by the files, gaps between the earliest and latest month, and statement periods that repeat. */
export function coverage(files: ServiceFile[]) {
  const covered = new Set<number>();
  const seen = new Map<string, number>();
  for (const file of files) {
    if (!file.periodFrom || !file.periodTo) continue;
    const key = `${file.periodFrom}|${file.periodTo}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    for (let index = monthIndex(file.periodFrom); index <= monthIndex(file.periodTo); index += 1) covered.add(index);
  }
  const sorted = [...covered].sort((a, b) => a - b);
  const gaps: string[] = [];
  for (let index = sorted[0] ?? 0; index <= (sorted[sorted.length - 1] ?? -1); index += 1) {
    if (!covered.has(index)) gaps.push(monthLabel(index));
  }
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key.replace("|", " to "));
  return { months: covered.size, gaps, duplicates };
}

/** Item status calculated from valid, approved files rather than the number of uploads. */
export function deriveStatus(item: ServiceChecklistItem, today: string): ServiceDocStatus {
  const files = item.files ?? [];
  if (files.length === 0) return item.status;
  if (files.some((file) => file.status === "Uploaded")) return "Uploaded";
  const valid = validFiles(item, today);
  const needed = requiredFiles(item);
  const periodOk = !isPeriodBased(item.documentCode) || coverage(valid).gaps.length === 0;
  if (valid.length >= needed && periodOk) return "Approved";
  if (files.some((file) => isExpiredFile(file, today)) && valid.length < needed) return "Expired";
  if (files.some((file) => file.status === "Rejected")) return "Rejected";
  return "Pending";
}

export function latestExpiry(item: ServiceChecklistItem, today: string) {
  const dates = validFiles(item, today)
    .map((file) => file.expiryDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0];
}

export function latestRejection(item: ServiceChecklistItem) {
  return [...(item.files ?? [])].reverse().find((file) => file.status === "Rejected")?.rejectionReason;
}

export function readFileForStore(file: File): Promise<{ name: string; size: number; dataUrl?: string }> {
  return new Promise((resolve) => {
    if (file.size > MAX_PREVIEW_BYTES) {
      resolve({ name: file.name, size: file.size });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, size: file.size, dataUrl: typeof reader.result === "string" ? reader.result : undefined });
    reader.onerror = () => resolve({ name: file.name, size: file.size });
    reader.readAsDataURL(file);
  });
}

export function sizeLabel(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
