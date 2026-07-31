import { Bell, BrainCircuit, Clock, Heart, TrendingUp } from "lucide-react";
import type { ComparisonResponse } from "../types/commerce";

export function Dashboard({ response }: { response: ComparisonResponse | null }) {
  const best = response?.offers[0];
  const pricedOffers = response?.offers.filter((item) => item.price) ?? [];
  const ratedOffers = response?.offers.filter((item) => item.rating > 0) ?? [];
  const averageRating = ratedOffers.length
    ? (ratedOffers.reduce((sum, item) => sum + item.rating, 0) / ratedOffers.length).toFixed(1)
    : "No data";
  const cards = [
    { label: "Best Value", value: best?.platform ?? "No data", icon: BrainCircuit },
    { label: "Lowest Price", value: pricedOffers.length ? `Rs. ${Math.min(...pricedOffers.map((item) => item.price || 0)).toLocaleString("en-IN")}` : "Open result", icon: TrendingUp },
    { label: "Fastest", value: response?.offers.find((item) => item.estimatedDeliveryDate === "Tomorrow")?.platform ?? "Open result", icon: Clock },
    { label: "Providers", value: response ? String(response.offers.length) : "No data", icon: Heart },
    { label: "Avg Rating", value: averageRating, icon: Bell }
  ];

  return (
    <section className="dashboard">
      {cards.map(({ label, value, icon: Icon }) => (
        <div className="metric" key={label}>
          <Icon size={19} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
