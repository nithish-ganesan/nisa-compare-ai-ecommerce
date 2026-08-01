import axios from "axios";
import type { ComparisonResponse, SaleEvent } from "../types/commerce";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1",
  timeout: 10000
});

export async function compareProducts(query: string): Promise<ComparisonResponse> {
  const response = await api.post<ComparisonResponse>("/compare", { query });
  return response.data;
}

export async function fetchSales(): Promise<SaleEvent[]> {
  const response = await api.get<SaleEvent[]>("/sales");
  return response.data;
}
