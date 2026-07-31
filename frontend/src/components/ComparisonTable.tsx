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
        <span>AI-powered comparison: prices, discounts, delivery dates, and availability may vary on the actual seller platform. Click the seller link to view the exact amount before purchase.</span>
      </aside>
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
            <strong>Rs. {offer.price.toLocaleString("en-IN")}</strong>
            <span>{offer.bankOffers[0]}</span>
            <span className="rating"><Star size={15} /> {offer.rating}</span>
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
