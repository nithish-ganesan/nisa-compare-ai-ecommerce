import axios from "axios";
import type { AuthResult, ComparisonResponse, SaleEvent } from "../types/commerce";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1",
  timeout: 1500
});

let authToken = "";

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = "";
}

export async function registerAccount(username: string, email: string, password: string): Promise<AuthResult> {
  const response = await api.post<AuthResult>("/auth/register", { username, email, password });
  setAuthToken(response.data.token);
  return response.data;
}

export async function loginAccount(login: string, password: string): Promise<AuthResult> {
  const response = await api.post<AuthResult>("/auth/login", { login, password });
  setAuthToken(response.data.token);
  return response.data;
}

export async function fetchCurrentUser(): Promise<Omit<AuthResult, "token" | "expiresAt">> {
  const response = await api.get<Omit<AuthResult, "token" | "expiresAt">>("/auth/me");
  return response.data;
}

export async function logoutAccount(): Promise<void> {
  await api.post("/auth/logout");
  clearAuthToken();
}

export async function compareProducts(query: string): Promise<ComparisonResponse> {
  const response = await api.post<ComparisonResponse>("/compare", { query });
  return response.data;
}

export async function fetchSales(): Promise<SaleEvent[]> {
  const response = await api.get<SaleEvent[]>("/sales");
  return response.data;
}
