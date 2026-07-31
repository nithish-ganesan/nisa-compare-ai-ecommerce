package com.nisa.commerce.domain;

public record SaleEvent(
    String platform,
    String saleName,
    String productCategory,
    String discountText,
    String bankOffer,
    String startsOn,
    String endsOn,
    String saleUrl
) {}
