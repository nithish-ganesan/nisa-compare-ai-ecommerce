package com.nisa.commerce.domain;

import java.util.List;

public record ComparisonResponse(ProductIntent intent, String recommendation, String summary, List<ProductOffer> offers) {}
