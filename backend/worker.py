"""RQ worker entrypoint. Run this as its own process, separate from the API:

    python worker.py

Two separate Windows incompatibilities to work around here, both fixed the
same way - by not using anything POSIX-only:

1. RQ's default Worker forks a child process per job via os.fork(), which
   doesn't exist on Windows. SimpleWorker runs jobs in the same process
   instead - no fork.
2. RQ's default job-timeout mechanism (UnixSignalDeathPenalty) uses
   signal.SIGALRM, also POSIX-only. TimerDeathPenalty enforces the same
   timeout using a background Timer thread instead, which works everywhere.

On a real Linux deployment, swap back to Worker + the default death penalty
for per-job process isolation.
"""

import time

from redis.exceptions import ConnectionError as RedisConnectionError
from rq import SimpleWorker
from rq.timeouts import TimerDeathPenalty

from jobs.queue import _connection, jobs_queue

if __name__ == "__main__":
    # A dropped Redis connection (idle overnight, a Docker restart, a network
    # blip) makes RQ give up and exit rather than reconnect on its own - so this
    # keeps making a fresh Worker and re-entering work() instead of the process
    # just dying silently and leaving every future job stuck "queued" forever.
    while True:
        try:
            worker = SimpleWorker([jobs_queue], connection=_connection)
            worker.death_penalty_class = TimerDeathPenalty
            worker.work()
            break  # work() only returns normally on a clean shutdown
        except RedisConnectionError:
            print("Lost the Redis connection - reconnecting in 3s...")
            time.sleep(3)
