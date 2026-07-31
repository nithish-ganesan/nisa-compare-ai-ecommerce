package com.nisa.commerce.application;

import com.nisa.commerce.domain.ComparisonResponse;
import com.nisa.commerce.domain.ProductIntent;
import com.nisa.commerce.domain.ProductOffer;
import com.nisa.commerce.infrastructure.MockSearchProvider;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class ComparisonEngine {
  private final ProductExtractionService extractionService;
  private final MockSearchProvider searchProvider;
  private final RecommendationService recommendationService;

  public ComparisonEngine(ProductExtractionService extractionService, MockSearchProvider searchProvider, RecommendationService recommendationService) {
    this.extractionService = extractionService;
    this.searchProvider = searchProvider;
    this.recommendationService = recommendationService;
  }

  public Mono<ComparisonResponse> compare(String query) {
    ProductIntent intent = extractionService.extract(query);
    return searchProvider.search(intent)
        .map(recommendationService::rank)
        .map(offers -> {
          ProductOffer best = offers.stream().min(Comparator.comparingInt(ProductOffer::price)).orElseThrow();
          String recommendation = "%s is the best value right now for %s at Rs. %,d with a %s score."
              .formatted(best.platform(), best.productName(), best.price(), best.score());
          String summary = intent.brand().equals("Unknown")
              ? "Found %d brand options for %s, sorted from lowest price to highest."
                  .formatted(offers.size(), intent.productName())
              : "Found %d trusted options for %s, sorted from lowest price to highest."
                  .formatted(offers.size(), best.productName());
          return new ComparisonResponse(intent, recommendation, summary, offers);
        });
  }
}
