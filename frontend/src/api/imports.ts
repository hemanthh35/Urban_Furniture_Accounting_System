import { requestUpload } from "./client";

export interface ImportResult {
  created: number;
  errors: string[];
}

export const importsApi = {
  contacts: (file: File) => requestUpload<ImportResult>("/contacts/bulk-import", file),
  products: (file: File) => requestUpload<ImportResult>("/products/bulk-import", file),
};
