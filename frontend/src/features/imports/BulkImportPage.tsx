import { useRef, useState } from "react";
import { importsApi, type ImportResult } from "../../api/imports";
import { ApiError } from "../../api/client";
import { downloadCsv } from "../../utils/export";

type Entity = "contacts" | "products";

interface ColumnSpec {
  name: string;
  required: boolean;
  hint: string;
}

const COLUMNS: Record<Entity, ColumnSpec[]> = {
  contacts: [
    { name: "name", required: true, hint: "Contact's full name" },
    { name: "type", required: true, hint: "Customer, Vendor, or Both" },
    { name: "email", required: false, hint: "-" },
    { name: "mobile", required: false, hint: "-" },
    { name: "city", required: false, hint: "-" },
    { name: "state", required: false, hint: "-" },
    { name: "pincode", required: false, hint: "-" },
  ],
  products: [
    { name: "name", required: true, hint: "Product name" },
    { name: "type", required: true, hint: "Goods, Service, or Combo" },
    { name: "sales_price", required: true, hint: "In rupees, e.g. 1500.00" },
    { name: "cost", required: true, hint: "In rupees, e.g. 900.00" },
    { name: "category", required: false, hint: "-" },
    { name: "gst_percent", required: false, hint: "Whole number, e.g. 18" },
  ],
};

const SAMPLE_ROW: Record<Entity, (string | number)[]> = {
  contacts: ["Rahul Sharma", "Vendor", "rahul@example.com", "9876543210", "Hyderabad", "Telangana", "500001"],
  products: ["Wooden Chair", "Goods", "1500.00", "900.00", "Furniture", "18"],
};

export default function BulkImportPage() {
  const [entity, setEntity] = useState<Entity>("contacts");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickEntity(next: Entity) {
    setEntity(next);
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadTemplate() {
    downloadCsv(`${entity}-template.csv`, COLUMNS[entity].map((c) => c.name), [SAMPLE_ROW[entity]]);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const uploadFn = entity === "contacts" ? importsApi.contacts : importsApi.products;
      setResult(await uploadFn(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Bulk Import</h1>
          <p className="page-sub">Upload a CSV to create many Contacts or Products at once, instead of one at a time.</p>
        </div>
      </div>

      <div className="form-card" style={{ maxWidth: 640 }}>
        <label>
          What are you importing?
          <select value={entity} onChange={(e) => pickEntity(e.target.value as Entity)}>
            <option value="contacts">Contacts</option>
            <option value="products">Products</option>
          </select>
        </label>

        <div className="item-rows-label">Expected columns (first row of your CSV must be exactly these headers)</div>
        <div className="table-wrap" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Required</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {COLUMNS[entity].map((col) => (
                <tr key={col.name}>
                  <td className="mono">{col.name}</td>
                  <td>{col.required ? "Yes" : "No"}</td>
                  <td className="muted">{col.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="secondary" onClick={downloadTemplate} style={{ marginBottom: 24 }}>
          Download CSV template
        </button>

        <label>
          CSV file
          <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        {error && <div className="form-error">{error}</div>}
        {result && (
          <div className={result.errors.length === 0 ? "success-message" : "form-error"}>
            Successfully created {result.created} {entity}.
            {result.errors.length > 0 && (
              <>
                {" "}{result.errors.length} row{result.errors.length === 1 ? "" : "s"} failed:
                <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: "flex-start", marginTop: 16 }}>
          <button type="button" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
