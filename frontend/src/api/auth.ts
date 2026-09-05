import { request } from "./client";

export interface TokenResponse {
  access_token: string;
  role: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
  contact_id: number | null;
  is_active: boolean;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }),
  signup: (email: string, password: string, role: string) =>
    request<TokenResponse>("/auth/signup", { method: "POST", body: { email, password, role } }),
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/auth/change-password", { method: "POST", body: { current_password, new_password } }),
  listUsers: () => request<User[]>("/auth/users"),
  deactivateUser: (id: number) => request<User>(`/auth/users/${id}/deactivate`, { method: "POST" }),
  activateUser: (id: number) => request<User>(`/auth/users/${id}/activate`, { method: "POST" }),
};
