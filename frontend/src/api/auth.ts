import { request } from "./client";

export interface TokenResponse {
  access_token: string;
  role: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }),
  signup: (email: string, password: string, role: string) =>
    request<TokenResponse>("/auth/signup", { method: "POST", body: { email, password, role } }),
};
