import { useState } from "react";
import { jobsApi, type JobStatus } from "../../api/jobs";
import { requestBlob, ApiError } from "../../api/client";

// Both jobs here run on a separate worker process (see backend/worker.py), not
// inside this request - so we start them, then poll for the result instead of
// waiting on one long HTTP call. Proves the background-job pipeline is real,
// not just a spinner: kill the API mid-check and the job still finishes.
type JobKind = "ledger-check" | "bulk-export";

export default function JobsPage() {
  const [ledgerJobId, setLedgerJobId] = useState<string | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<JobStatus | null>(null);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function poll(jobId: string, kind: JobKind) {
    for (let i = 0; i < 40; i++) {
      const status = await jobsApi.getStatus(jobId);
      if (kind === "ledger-check") setLedgerStatus(status);
      else setExportStatus(status);
      if (status.status === "finished" || status.status === "failed") return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async function runLedgerCheck() {
    setError(null);
    setLedgerStatus(null);
    try {
      const { job_id } = await jobsApi.startLedgerCheck();
      setLedgerJobId(job_id);
      await poll(job_id, "ledger-check");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the ledger check");
    }
  }

  async function runBulkExport() {
    setError(null);
    setExportStatus(null);
    try {
      const { job_id } = await jobsApi.startBulkExport();
      setExportJobId(job_id);
      await poll(job_id, "bulk-export");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the export");
    }
  }

  async function downloadExport() {
    if (!exportJobId) return;
    try {
      const blob = await requestBlob(`/jobs/${exportJobId}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invoices.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the file");
    }
  }

  const ledgerResult = ledgerStatus?.result as { total_entries_checked: number; balanced: boolean; total_debit_cents: number; total_credit_cents: number } | null;

  return (
    <div>
      <div className="page-head">
        <h1>System Jobs</h1>
        <p className="page-sub">Background work that runs on a separate worker process, so a slow check never blocks the app.</p>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-tile">
          <div className="stat-tile-label">Ledger Integrity Check</div>
          <p className="muted" style={{ marginTop: 8 }}>Re-adds every debit and credit ever posted and confirms they still match.</p>
          <button onClick={runLedgerCheck} disabled={ledgerStatus?.status === "queued" || ledgerStatus?.status === "started"} style={{ marginTop: 12 }}>
            {ledgerStatus?.status === "queued" || ledgerStatus?.status === "started" ? "Running..." : "Run Check"}
          </button>
          {ledgerJobId && <p className="muted" style={{ marginTop: 8 }}>Job: {ledgerJobId}</p>}
          {ledgerStatus?.status === "finished" && ledgerResult && (
            <p style={{ marginTop: 8 }}>
              <span className={ledgerResult.balanced ? "status-pill status-done" : "status-pill status-pending"}>
                {ledgerResult.balanced ? "BALANCED" : "OUT OF BALANCE"}
              </span>
              <br />
              {ledgerResult.total_entries_checked} entries checked
            </p>
          )}
          {ledgerStatus?.status === "failed" && <p className="form-error">Check failed - is the worker (python worker.py) running?</p>}
        </div>

        <div className="stat-tile">
          <div className="stat-tile-label">Bulk Invoice PDF Export</div>
          <p className="muted" style={{ marginTop: 8 }}>Generates a PDF for every customer invoice and zips them into one download.</p>
          <button onClick={runBulkExport} disabled={exportStatus?.status === "queued" || exportStatus?.status === "started"} style={{ marginTop: 12 }}>
            {exportStatus?.status === "queued" || exportStatus?.status === "started" ? "Running..." : "Run Export"}
          </button>
          {exportJobId && <p className="muted" style={{ marginTop: 8 }}>Job: {exportJobId}</p>}
          {exportStatus?.status === "finished" && (
            <p style={{ marginTop: 8 }}>
              <button className="link-btn" onClick={downloadExport}>Download invoices.zip</button>
            </p>
          )}
          {exportStatus?.status === "failed" && <p className="form-error">Export failed - is the worker (python worker.py) running?</p>}
        </div>
      </div>
    </div>
  );
}
