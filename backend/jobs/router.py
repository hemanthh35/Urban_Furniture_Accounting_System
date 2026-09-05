from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from rq.job import Job

from core.security import require_roles
from jobs.export_jobs import run_bulk_invoice_export
from jobs.ledger_jobs import run_ledger_integrity_check
from jobs.queue import _connection, jobs_queue

router = APIRouter(prefix="/jobs", tags=["jobs"])

CAN_RUN = require_roles("admin", "accountant")


@router.post("/ledger-check")
def start_ledger_check(_user=Depends(CAN_RUN)):
    job = jobs_queue.enqueue(run_ledger_integrity_check)
    return {"job_id": job.id}


@router.post("/bulk-invoice-export")
def start_bulk_export(_user=Depends(CAN_RUN)):
    job = jobs_queue.enqueue(run_bulk_invoice_export)
    return {"job_id": job.id}


def _fetch_job(job_id: str) -> Job:
    try:
        return Job.fetch(job_id, connection=_connection)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")


@router.get("/{job_id}")
def get_job_status(job_id: str, _user=Depends(CAN_RUN)):
    job = _fetch_job(job_id)
    result = job.result
    is_file = isinstance(result, bytes)
    return {
        "status": job.get_status(),
        "result": None if is_file else result,
        "has_file_result": is_file,
    }


@router.get("/{job_id}/download")
def download_job_result(job_id: str, _user=Depends(CAN_RUN)):
    job = _fetch_job(job_id)
    if job.get_status() != "finished" or not isinstance(job.result, bytes):
        raise HTTPException(status_code=409, detail="Job result is not ready or is not a downloadable file")
    return Response(content=job.result, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=invoices.zip"})
