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
  login: (login_id: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email: login_id, password } }),
  signup: (payload: { name: string; login_id: string; email: string; password: string; password_confirmation: string; role: string }) =>
    request<TokenResponse>("/auth/signup", { method: "POST", body: payload }),
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/auth/change-password", { method: "POST", body: { current_password, new_password } }),
  listUsers: () => request<User[]>("/auth/users"),
  createUser: (payload: { name: string; login_id: string; email: string; role: string; password: string }) => request<User>("/auth/users", { method: "POST", body: payload }),
  deactivateUser: (id: number) => request<User>(`/auth/users/${id}/deactivate`, { method: "POST" }),
  activateUser: (id: number) => request<User>(`/auth/users/${id}/activate`, { method: "POST" }),
};
