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
}

export interface ContactCreate {
  name: string;
  type: string;
  email?: string | null;
  mobile?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  create_login_password?: string | null; // spec: contact users are created alongside Contact master data
}

export const contactsApi = {
  list: () => request<Contact[]>("/contacts"),
  create: (payload: ContactCreate) => request<Contact>("/contacts", { method: "POST", body: payload }),
};
