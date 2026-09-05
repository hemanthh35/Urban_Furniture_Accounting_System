# Urban Furniture Accounting System - ER Diagram

```mermaid
erDiagram
    SYSTEM_USER {
        int user_id PK
        string name
        string email
        string role
        int contact_id FK
    }

    CONTACT {
        int contact_id PK
        string name
        string type
        string email
        string mobile
        string address
        string city
        string state
        string pincode
        string profile_image
    }

    PRODUCT {
        int product_id PK
        string product_name
        string type
        decimal sales_price
        decimal purchase_price
        string category
    }

    CHART_OF_ACCOUNT {
        int account_id PK
        string account_name
        string account_type
        int parent_account_id FK
    }

    JOURNAL {
        int journal_id PK
        string journal_name
        string journal_type
        int default_debit_account_id FK
        int default_credit_account_id FK
    }

    JOURNAL_ENTRY {
        int entry_id PK
        int journal_id FK
        date entry_date
        string reference
        string source_type
        int source_id
    }

    JOURNAL_ITEM {
        int item_id PK
        int entry_id FK
        int account_id FK
        int analytic_account_id FK
        decimal debit
        decimal credit
    }

    ANALYTIC_ACCOUNT {
        int analytic_account_id PK
        string name
        string type
    }

    BUDGET {
        int budget_id PK
        string budget_name
        date period_start
        date period_end
        int responsible_user_id FK
    }

    BUDGET_LINE {
        int budget_line_id PK
        int budget_id FK
        int analytic_account_id FK
        decimal planned_amount
    }

    PURCHASE_ORDER {
        int purchase_order_id PK
        int vendor_contact_id FK
        int created_by FK
        date order_date
        string status
        decimal total_amount
    }

    PURCHASE_ORDER_LINE {
        int po_line_id PK
        int purchase_order_id FK
        int product_id FK
        decimal quantity
        decimal unit_price
        decimal tax_amount
    }

    VENDOR_BILL {
        int bill_id PK
        int purchase_order_id FK
        int vendor_contact_id FK
        date invoice_date
        date due_date
        string status
        decimal total_amount
    }

    VENDOR_BILL_LINE {
        int bill_line_id PK
        int bill_id FK
        int product_id FK
        decimal quantity
        decimal unit_price
        decimal tax_amount
    }

    SALES_ORDER {
        int sales_order_id PK
        int customer_contact_id FK
        int created_by FK
        date order_date
        string status
        decimal total_amount
    }

    SALES_ORDER_LINE {
        int so_line_id PK
        int sales_order_id FK
        int product_id FK
        decimal quantity
        decimal unit_price
        decimal tax_amount
    }

    CUSTOMER_INVOICE {
        int invoice_id PK
        int sales_order_id FK
        int customer_contact_id FK
        date invoice_date
        date due_date
        string status
        decimal total_amount
    }

    CUSTOMER_INVOICE_LINE {
        int invoice_line_id PK
        int invoice_id FK
        int product_id FK
        decimal quantity
        decimal unit_price
        decimal tax_amount
    }

    PAYMENT {
        int payment_id PK
        int invoice_id FK
        int bill_id FK
        int account_id FK
        int recorded_by FK
        date payment_date
        string payment_method
        decimal amount
        string direction
    }

    CONTACT ||--o| SYSTEM_USER : login
    SYSTEM_USER ||--o{ PURCHASE_ORDER : creates
    SYSTEM_USER ||--o{ SALES_ORDER : creates
    SYSTEM_USER ||--o{ PAYMENT : records
    SYSTEM_USER ||--o{ BUDGET : responsible_for

    CONTACT ||--o{ PURCHASE_ORDER : vendor
    CONTACT ||--o{ VENDOR_BILL : vendor
    CONTACT ||--o{ SALES_ORDER : customer
    CONTACT ||--o{ CUSTOMER_INVOICE : customer

    PURCHASE_ORDER ||--o{ PURCHASE_ORDER_LINE : contains
    PRODUCT ||--o{ PURCHASE_ORDER_LINE : ordered_product
    PURCHASE_ORDER ||--o| VENDOR_BILL : converted_to

    VENDOR_BILL ||--o{ VENDOR_BILL_LINE : contains
    PRODUCT ||--o{ VENDOR_BILL_LINE : billed_product

    SALES_ORDER ||--o{ SALES_ORDER_LINE : contains
    PRODUCT ||--o{ SALES_ORDER_LINE : sold_product
    SALES_ORDER ||--o| CUSTOMER_INVOICE : converted_to

    CUSTOMER_INVOICE ||--o{ CUSTOMER_INVOICE_LINE : contains
    PRODUCT ||--o{ CUSTOMER_INVOICE_LINE : invoiced_product

    CUSTOMER_INVOICE ||--o{ PAYMENT : receives
    VENDOR_BILL ||--o{ PAYMENT : paid_through
    CHART_OF_ACCOUNT ||--o{ PAYMENT : cash_bank_account

    JOURNAL ||--o{ JOURNAL_ENTRY : contains
    JOURNAL_ENTRY ||--o{ JOURNAL_ITEM : has
    CHART_OF_ACCOUNT ||--o{ JOURNAL_ITEM : posted_to
    ANALYTIC_ACCOUNT ||--o{ JOURNAL_ITEM : analyzed_by

    CHART_OF_ACCOUNT ||--o{ CHART_OF_ACCOUNT : parent_account
    CHART_OF_ACCOUNT ||--o{ JOURNAL : default_debit
    CHART_OF_ACCOUNT ||--o{ JOURNAL : default_credit

    ANALYTIC_ACCOUNT ||--o{ BUDGET_LINE : assigned_to
    BUDGET ||--o{ BUDGET_LINE : contains

    CUSTOMER_INVOICE ||--o| JOURNAL_ENTRY : posts
    VENDOR_BILL ||--o| JOURNAL_ENTRY : posts
    PAYMENT ||--o| JOURNAL_ENTRY : posts
```

## Notes

- `PAYMENT` should reference either a customer invoice or a vendor bill.
- `JOURNAL_ITEM` stores the debit and credit postings used to generate financial reports.
- Balance Sheet, Profit & Loss, and Budget Reports are generated from transaction data.
