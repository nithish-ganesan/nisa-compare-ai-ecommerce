package com.nisa.commerce.domain;

import java.util.List;

public record ProductOffer(
    String platform,
    String productName,
    int price,
    int discount,
    int deliveryCharges,
    String estimatedDeliveryDate,
    String sellerName,
    double rating,
    List<String> availableOffers,
    List<String> bankOffers,
    String exchangeOffer,
    String emi,
    String warranty,
    String stockAvailability,
    String productUrl,
    int score,
    List<String> badges
) {
  public ProductOffer withScore(int updatedScore) {
    return new ProductOffer(platform, productName, price, discount, deliveryCharges, estimatedDeliveryDate, sellerName, rating,
        availableOffers, bankOffers, exchangeOffer, emi, warranty, stockAvailability, productUrl, updatedScore, badges);
  }
}
