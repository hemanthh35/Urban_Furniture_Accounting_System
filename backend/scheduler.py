"""Runs the "Automatic daily job" for payment reminders. Its own process,
separate from the API and the worker:

    python scheduler.py

It doesn't run the reminder job itself - it just enqueues it onto the same
jobs_queue the worker already listens on, once every 24 hours, forever. So
the worker (worker.py) must also be running for reminders to actually send.
"""

import time

from jobs.queue import jobs_queue
from jobs.reminder_jobs import run_send_payment_reminders

_INTERVAL_SECONDS = 24 * 60 * 60

if __name__ == "__main__":
    while True:
        jobs_queue.enqueue(run_send_payment_reminders)
        time.sleep(_INTERVAL_SECONDS)
