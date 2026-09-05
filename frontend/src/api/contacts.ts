import { request } from "./client";

export interface Contact {
  id: number;
  name: string;
  type: "Customer" | "Vendor" | "Both";
  email: string | null;
  mobile: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  profile_image: string | null;
  is_archived: boolean;
}

export interface ContactCreate {
  name: string;
  type: string;
  email?: string | null;
  mobile?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  profile_image?: string | null;
  create_login_password?: string | null; // spec: contact users are created alongside Contact master data
}

export type ContactUpdate = Omit<ContactCreate, "create_login_password">;

export const contactsApi = {
  list: (includeArchived = false) => request<Contact[]>(`/contacts${includeArchived ? "?include_archived=true" : ""}`),
  create: (payload: ContactCreate) => request<Contact>("/contacts", { method: "POST", body: payload }),
  update: (id: number, payload: ContactUpdate) => request<Contact>(`/contacts/${id}`, { method: "PUT", body: payload }),
  archive: (id: number) => request<void>(`/contacts/${id}/archive`, { method: "POST" }),
  restore: (id: number) => request<void>(`/contacts/${id}/restore`, { method: "POST" }),
};
