import { ExternalLink, Info, ShieldCheck, Star, Truck } from "lucide-react";
import type { ProductOffer } from "../types/commerce";

export function ComparisonTable({ offers }: { offers: ProductOffer[] }) {
  return (
    <section className="table-section">
      <div className="section-heading">
        <div>
          <p>Live Comparison</p>
          <h2>Best purchase options</h2>
        </div>
        <div className="legend"><Star size={16} /> Score uses price, rating, offers, seller, delivery</div>
      </div>
      <aside className="comparison-disclaimer">
        <Info size={17} />
        <span>AI-powered Google Shopping comparison via SerpAPI. Prices come from shopping results when available. Click the seller link to confirm the exact current amount before purchase.</span>
      </aside>
      {offers.length === 0 && (
        <div className="empty-comparison">
          No verified seller offers found for this product. Try another brand or broader product keyword.
        </div>
      )}
      <div className="comparison-grid">
        <div className="grid-row grid-head">
          <span>Platform</span><span>Price</span><span>Offer</span><span>Rating</span><span>Delivery</span><span>Seller</span><span>Score</span><span></span>
        </div>
        {offers.map((offer) => (
          <div className="grid-row" key={offer.platform}>
            <div>
              <strong>{offer.platform}</strong>
              <small className="product-name">{offer.productName}</small>
              <div className="badges">{offer.badges.map((badge) => <span key={badge}>{badge}</span>)}</div>
            </div>
            <div className="price-stack">
              <strong>{offer.price ? `Rs. ${offer.price.toLocaleString("en-IN")}` : "View on site"}</strong>
              {offer.maximumRetailPrice && offer.price && offer.maximumRetailPrice > offer.price && (
                <small>MRP Rs. {offer.maximumRetailPrice.toLocaleString("en-IN")} · {offer.discount}% off</small>
              )}
            </div>
            <span>{offer.bankOffers.filter(Boolean).slice(0, 2).join(" · ") || "Check seller page"}</span>
            <span className="rating"><Star size={15} /> {offer.rating ? `${offer.rating}${offer.reviews ? ` (${offer.reviews})` : ""}` : "N/A"}</span>
            <span className="rating"><Truck size={15} /> {offer.estimatedDeliveryDate}</span>
            <span className="rating"><ShieldCheck size={15} /> {offer.sellerName}</span>
            <strong>{offer.score}</strong>
            <a className="buy" href={offer.productUrl} target="_blank" rel="noreferrer" title="Open product"><ExternalLink size={17} /></a>
          </div>
        ))}
      </div>
    </section>
  );
}
