package com.nisa.commerce.application;

import com.nisa.commerce.domain.ProductOffer;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {
  public List<ProductOffer> rank(List<ProductOffer> offers) {
    int lowestPrice = offers.stream()
        .mapToInt(ProductOffer::price)
        .min()
        .orElse(1);

    return offers.stream()
        .map(offer -> offer.withScore(score(offer, lowestPrice)))
        .sorted(Comparator.comparingInt(ProductOffer::price))
        .toList();
  }

  private int score(ProductOffer offer, int lowestPrice) {
    double priceScore = Math.min(100, (lowestPrice / (double) Math.max(1, offer.price())) * 100);
    double ratingScore = offer.rating() * 18;
    double discountScore = offer.discount() * 2.2;
    double deliveryScore = offer.estimatedDeliveryDate().equals("Tomorrow") ? 14 : 8;
    double sellerScore = offer.platform().equals("Apple Store") || offer.platform().equals("Amazon") ? 10 : 7;
    int score = (int) Math.round(priceScore * 0.42 + ratingScore * 0.22 + discountScore * 0.14 + deliveryScore * 0.12 + sellerScore * 0.1);
    return Math.max(0, Math.min(100, score));
  }
}
