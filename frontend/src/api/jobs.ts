import { request } from "./client";

export interface JobStatus {
  status: "queued" | "started" | "finished" | "failed";
  result: unknown;
  has_file_result: boolean;
}

export const jobsApi = {
  startLedgerCheck: () => request<{ job_id: string }>("/jobs/ledger-check", { method: "POST" }),
  startBulkExport: () => request<{ job_id: string }>("/jobs/bulk-invoice-export", { method: "POST" }),
  getStatus: (jobId: string) => request<JobStatus>(`/jobs/${jobId}`),
};
