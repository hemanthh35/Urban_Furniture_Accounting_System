"""Shared CSV bulk-import helper - parses an uploaded CSV and calls one create
function per row, collecting per-row failures instead of stopping the whole
batch on the first bad row (a typo in row 40 shouldn't lose rows 1-39)."""

import csv
import io
from typing import Callable

from core.errors import AppError


def import_csv_rows(content: bytes, create_row: Callable[[dict], None]) -> dict:
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    created = 0
    errors: list[str] = []
    for i, raw_row in enumerate(reader, start=2):  # row 1 is the header
        # Header matching is case/whitespace-insensitive - "Name" from an
        # exported CSV should work just as well as "name" from the template,
        # since re-importing your own export is an obvious thing to try.
        row = {(key or "").strip().lower(): value for key, value in raw_row.items()}
        try:
            create_row(row)
            created += 1
        except AppError as e:
            errors.append(f"Row {i}: {e.message}")
        except Exception as e:
            errors.append(f"Row {i}: {e}")
    return {"created": created, "errors": errors}
