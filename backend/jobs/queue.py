"""RQ (Redis Queue) setup for background jobs. Anything slow enough to make an
admin wait at the browser - checking the whole ledger, generating a PDF per
invoice - runs here instead of blocking the request, in a separate worker
process that survives an API restart and scales independently of it."""

import redis
from rq import Queue

from core.config import settings

# RQ needs raw byte responses to pickle job payloads correctly - a plain
# redis-py client would otherwise decode everything to str and break results
# that are bytes (like a generated PDF or ZIP file).
#
# health_check_interval pings the connection every 30s of inactivity - without
# it, a connection idle for a while (e.g. overnight, or just between demo runs)
# goes stale silently (Docker Desktop's networking layer drops it) and the
# worker's next BLPOP fails with "Redis connection timeout, quitting" instead
# of just reconnecting.
_connection = redis.Redis.from_url(settings.redis_url, decode_responses=False, health_check_interval=30)

jobs_queue = Queue("urbanfurniture", connection=_connection)
