import { request } from "./client";

export interface JobStatus {
  status: "queued" | "started" | "finished" | "failed";
  result: unknown;
  has_file_result: boolean;
}

export const jobsApi = {
  startLedgerCheck: () => request<{ job_id: string }>("/jobs/ledger-check", { method: "POST" }),
  startBulkExport: (fromDate = "", toDate = "") => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    const query = params.toString();
    return request<{ job_id: string }>(`/jobs/bulk-invoice-export${query ? `?${query}` : ""}`, { method: "POST" });
  },
  getStatus: (jobId: string) => request<JobStatus>(`/jobs/${jobId}`),
  startPaymentReminders: () => request<{ job_id: string }>("/jobs/send-payment-reminders", { method: "POST" }),
};
