"""The actual app - imports every module's router and mounts it, and turns our
AppError into a consistent JSON error shape instead of a raw 500 traceback."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from accounts.router import router as accounts_router
from auth.router import router as auth_router
from budgets.router import router as budgets_router
from contacts.router import router as contacts_router
from core.errors import AppError
from journals.router import router as journals_router
from payments.router import router as payments_router
from products.router import router as products_router
from purchases.router import router as purchases_router
from reports.router import router as reports_router
from sales.router import router as sales_router
from stock.router import router as stock_router

app = FastAPI(title="Urban Furniture Accounting System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
def handle_app_error(_request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": exc.code, "message": exc.message}})


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(contacts_router)
app.include_router(products_router)
app.include_router(accounts_router)
app.include_router(budgets_router)
app.include_router(purchases_router)
app.include_router(sales_router)
app.include_router(payments_router)
app.include_router(reports_router)
app.include_router(journals_router)
app.include_router(stock_router)
