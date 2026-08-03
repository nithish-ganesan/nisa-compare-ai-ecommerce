import axios from "axios";
import type { ComparisonResponse, SaleEvent } from "../types/commerce";

export type AuthUser = { id: string; email: string };
type AuthResponse = { token: string; user: AuthUser };
const sessionKey = "nisa-auth-token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1",
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(sessionKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function storeSession(token: string) {
  window.localStorage.setItem(sessionKey, token);
}

export function clearSession() {
  window.localStorage.removeItem(sessionKey);
}

export function hasSession() {
  return Boolean(window.localStorage.getItem(sessionKey));
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse & { isNewUser?: boolean }> {
  const response = await api.post<AuthResponse & { isNewUser?: boolean }>("/auth/google", { idToken });
  return response.data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await api.get<{ user: AuthUser }>("/auth/me");
  return response.data.user;
}

export async function compareProducts(query: string): Promise<ComparisonResponse> {
  const response = await api.post<ComparisonResponse>("/compare", { query });
  return response.data;
}

export async function fetchSales(): Promise<SaleEvent[]> {
  const response = await api.get<SaleEvent[]>("/sales");
  return response.data;
}
