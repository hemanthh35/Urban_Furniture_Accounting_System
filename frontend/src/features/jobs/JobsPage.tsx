import { useState } from "react";
import DatePicker from "../../components/DatePicker";
import { jobsApi, type JobStatus } from "../../api/jobs";
import { requestBlob, ApiError } from "../../api/client";

type JobKind = "ledger-check" | "bulk-export" | "payment-reminders";
const NGINX_URL = "http://localhost:8020/health";

function isRunning(status: JobStatus | null) {
  return status?.status === "queued" || status?.status === "started";
}

function statusText(status: JobStatus | null) {
  if (!status) return "Ready to run";
  if (status.status === "queued") return "Waiting in queue";
  if (status.status === "started") return "Worker is running";
  if (status.status === "finished") return "Completed successfully";
  return "Job failed";
}

function statusClass(status: JobStatus | null) {
  if (!status || status.status === "queued" || status.status === "started") return "job-status job-status-neutral";
  if (status.status === "finished") return "job-status job-status-success";
  return "job-status job-status-danger";
}

export default function JobsPage() {
  const [ledgerJobId, setLedgerJobId] = useState<string | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<JobStatus | null>(null);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<JobStatus | null>(null);
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(null);
  const [reminderJobId, setReminderJobId] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [lbHits, setLbHits] = useState<string[]>([]);
  const [lbPinging, setLbPinging] = useState(false);

  async function poll(jobId: string, kind: JobKind) {
    for (let i = 0; i < 40; i++) {
      const status = await jobsApi.getStatus(jobId);
      if (kind === "ledger-check") setLedgerStatus(status);
      else if (kind === "bulk-export") setExportStatus(status);
      else setReminderStatus(status);
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
    setDownloadedFilename(null);
    try {
      const { job_id } = await jobsApi.startBulkExport(exportFrom, exportTo);
      setExportJobId(job_id);
      await poll(job_id, "bulk-export");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the export");
    }
  }

  async function runPaymentReminders() {
    setError(null);
    setReminderStatus(null);
    try {
      const { job_id } = await jobsApi.startPaymentReminders();
      setReminderJobId(job_id);
      await poll(job_id, "payment-reminders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the reminder run");
    }
  }

  async function pingLoadBalancer() {
    setError(null);
    setLbPinging(true);
    setLbHits([]);
    try {
      for (let i = 0; i < 6; i++) {
        const res = await fetch(NGINX_URL, { cache: "no-store" });
        const upstream = res.headers.get("x-upstream-addr") ?? "Check DevTools response headers";
        setLbHits((previous) => [...previous, upstream]);
      }
    } catch {
      setError("Could not reach nginx on :8020. Start it with docker compose up -d in backend/.");
    } finally {
      setLbPinging(false);
    }
  }

  async function downloadExport() {
    if (!exportJobId) return;
    try {
      const { blob, filename } = await requestBlob(`/jobs/${exportJobId}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename ?? "invoices.zip";
      anchor.click();
      URL.revokeObjectURL(url);
      setDownloadedFilename(filename ?? "invoices.zip");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the file");
    }
  }

  const ledgerResult = ledgerStatus?.result as { total_entries_checked: number; balanced: boolean } | null;
  const reminderResult = reminderStatus?.result as { overdue_invoices_found: number; reminders_sent: number; skipped_no_email: number } | null;

  return (
    <div className="jobs-page">
      <div className="jobs-hero">
        <div>
          <h1>System Jobs</h1>
          <p>Run background tasks without slowing down the accounting system.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="jobs-grid">
        <article className="job-card">
          <h2>Ledger Integrity Check</h2>
          <p className="job-description">Checks that total debits and credits match for every posted journal entry.</p>
          <div className={statusClass(ledgerStatus)}><span className="job-status-dot" />{statusText(ledgerStatus)}</div>
          <button className="job-action" onClick={runLedgerCheck} disabled={isRunning(ledgerStatus)}>
            {isRunning(ledgerStatus) ? "Running check..." : "Run Check"}
          </button>
          {ledgerJobId && <p className="job-id">Job ID <code>{ledgerJobId}</code></p>}
          {ledgerStatus?.status === "finished" && ledgerResult && (
            <div className="job-result">
              <span className={ledgerResult.balanced ? "status-pill status-done" : "status-pill status-pending"}>
                {ledgerResult.balanced ? "Balanced" : "Out of balance"}
              </span>
              <span>{ledgerResult.total_entries_checked} entries checked</span>
            </div>
          )}
          {ledgerStatus?.status === "failed" && <p className="job-error">Check failed. Is `python worker.py` running?</p>}
        </article>

        <article className="job-card">
          <h2>Bulk Invoice PDF Export</h2>
          <p className="job-description">Creates a PDF for each customer invoice and puts them into one ZIP file.</p>
          <div className="job-date-fields">
            <DatePicker value={exportFrom} onChange={setExportFrom} title="From invoice date" placeholder="From date" />
            <span>to</span>
            <DatePicker value={exportTo} onChange={setExportTo} title="To invoice date" placeholder="To date" />
          </div>
          <p className="job-helper">Leave both dates blank to export every invoice.</p>
          <div className={statusClass(exportStatus)}><span className="job-status-dot" />{statusText(exportStatus)}</div>
          <button className="job-action" onClick={runBulkExport} disabled={isRunning(exportStatus)}>
            {isRunning(exportStatus) ? "Creating ZIP..." : "Run Export"}
          </button>
          {exportJobId && <p className="job-id">Job ID <code>{exportJobId}</code></p>}
          {exportStatus?.status === "finished" && (
            <div className="job-result job-result-column">
              <button className="link-btn" onClick={downloadExport}>Download ZIP</button>
              {downloadedFilename && <span>{downloadedFilename}</span>}
            </div>
          )}
          {exportStatus?.status === "failed" && <p className="job-error">Export failed. Is `python worker.py` running?</p>}
        </article>

        <article className="job-card">
          <h2>Payment Reminders</h2>
          <p className="job-description">Finds unpaid invoices past their due date and emails the customer.</p>
          <div className="job-note"><strong>Automatic schedule</strong><span>Runs once every 24 hours.</span></div>
          <div className={statusClass(reminderStatus)}><span className="job-status-dot" />{statusText(reminderStatus)}</div>
          <button className="job-action" onClick={runPaymentReminders} disabled={isRunning(reminderStatus)}>
            {isRunning(reminderStatus) ? "Sending reminders..." : "Run Now"}
          </button>
          {reminderJobId && <p className="job-id">Job ID <code>{reminderJobId}</code></p>}
          {reminderStatus?.status === "finished" && reminderResult && (
            <div className="job-result job-result-column">
              <span><strong>{reminderResult.reminders_sent}</strong> reminder{reminderResult.reminders_sent === 1 ? "" : "s"} sent</span>
              <span>{reminderResult.overdue_invoices_found} overdue found · {reminderResult.skipped_no_email} skipped</span>
            </div>
          )}
          {reminderStatus?.status === "failed" && <p className="job-error">Run failed. Is `python worker.py` running?</p>}
        </article>

        <article className="job-card">
          <h2>Load Balancer Check</h2>
          <p className="job-description">Sends six requests through Nginx to check both backend servers.</p>
          <div className="job-note"><strong>Expected result</strong><span>The responses should alternate between ports 8000 and 8001.</span></div>
          <div className="job-status job-status-neutral"><span className="job-status-dot" />Ready to test</div>
          <button className="job-action" onClick={pingLoadBalancer} disabled={lbPinging}>
            {lbPinging ? "Pinging Nginx..." : "Ping Nginx ×6"}
          </button>
          {lbHits.length > 0 && <div className="lb-results">{lbHits.map((hit, index) => <div key={index}><span>{index + 1}</span><code>{hit}</code></div>)}</div>}
          <p className="job-helper">Requires the Nginx container and both API servers to be running.</p>
        </article>
      </div>
    </div>
  );
}
