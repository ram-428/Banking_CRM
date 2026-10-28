import type { ParentRequestStatus, ServiceInstance, ServiceStatus } from "./types";

export const TERMINAL_SERVICE_STATUSES: ServiceStatus[] = ["Completed", "Rejected", "Cancelled"];

export function isTerminal(status: ServiceStatus) {
  return TERMINAL_SERVICE_STATUSES.includes(status);
}

export function parentRequestStatus(instances: Pick<ServiceInstance, "status">[]): ParentRequestStatus {
  if (instances.length === 0) return "Draft";
  const statuses = instances.map((item) => item.status);
  if (statuses.every((status) => status === "Draft")) return "Draft";
  if (statuses.every((status) => status === "Cancelled")) return "Cancelled";
  if (statuses.every((status) => status === "Completed")) return "Completed";
  const unresolved = statuses.filter((status) => !isTerminal(status));
  if (unresolved.length === 0) return "Closed – Mixed Outcome";
  if (unresolved.every((status) => status === "On Hold")) return "On Hold";
  return "In Progress";
}

export function mandatoryApproved(instance: ServiceInstance) {
  return instance.checklist.filter((item) => item.requirement === "Mandatory").every((item) => item.status === "Approved");
}

export function serviceCounts(instances: Pick<ServiceInstance, "status">[]) {
  const count = (status: ServiceStatus) => instances.filter((item) => item.status === status).length;
  return {
    pending: instances.filter((item) => item.status === "Draft" || item.status === "Documents Pending" || item.status === "Documents Under Review").length,
    processing: instances.filter((item) => item.status === "Documentation Completed" || item.status === "Under Processing").length,
    hold: count("On Hold"),
    completed: count("Completed"),
    rejected: count("Rejected"),
    cancelled: count("Cancelled"),
  };
}
