package com.nisa.commerce.application;

import com.nisa.commerce.domain.SaleEvent;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class SaleDiscoveryService {
  private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");

  public Mono<List<SaleEvent>> dailySales() {
    LocalDate today = LocalDate.now(INDIA_ZONE);
    return Mono.just(List.of(
        sale("Amazon", "Daily Deals", "Mobiles, appliances, audio", "Up to 55% off on selected deals",
            "Bank and card offers vary by product", today, today.plusDays(1), "https://www.amazon.in/deals"),
        sale("Flipkart", "Today Deals", "Electronics, fashion, home", "Lowest price drops refreshed daily",
            "Extra bank discount on eligible orders", today, today.plusDays(1), "https://www.flipkart.com/offers-store"),
        sale("Croma", "Electronics Offers", "TVs, refrigerators, laptops", "Store and online appliance offers",
            "Card cashback on selected products", today, today.plusDays(3), searchUrl("Croma", "electronics offers")),
        sale("Myntra", "Fashion Deals", "Shoes, clothing, accessories", "Brand offers and coupons",
            "Wallet and card cashback where available", today, today.plusDays(2), searchUrl("Myntra", "fashion sale")),
        sale("Reliance Digital", "Gadget Deals", "Phones, laptops, home electronics", "Daily device offers",
            "No-cost EMI on eligible products", today, today.plusDays(3), searchUrl("Reliance Digital", "sale"))
    ));
  }

  private SaleEvent sale(String platform, String saleName, String category, String discountText, String bankOffer,
      LocalDate startsOn, LocalDate endsOn, String saleUrl) {
    return new SaleEvent(platform, saleName, category, discountText, bankOffer, startsOn.toString(), endsOn.toString(), saleUrl);
  }

  private String searchUrl(String platform, String query) {
    String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
    return switch (platform) {
      case "Amazon" -> "https://www.amazon.in/s?k=" + encoded;
      case "Flipkart" -> "https://www.flipkart.com/search?q=" + encoded;
      case "Croma" -> "https://www.croma.com/search/?text=" + encoded;
      case "Reliance Digital" -> "https://www.reliancedigital.in/search?q=" + encoded;
      case "Myntra" -> "https://www.myntra.com/" + encoded.replace("+", "-");
      default -> "https://www.google.com/search?q=" + encoded;
    };
  }
}
