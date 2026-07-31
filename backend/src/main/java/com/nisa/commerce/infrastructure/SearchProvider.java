package com.nisa.commerce.infrastructure;

import com.nisa.commerce.domain.ProductIntent;
import com.nisa.commerce.domain.ProductOffer;
import java.util.List;
import reactor.core.publisher.Mono;

public interface SearchProvider {
  Mono<List<ProductOffer>> search(ProductIntent intent);
}
