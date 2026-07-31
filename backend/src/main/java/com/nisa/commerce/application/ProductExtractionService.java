package com.nisa.commerce.application;

import com.nisa.commerce.domain.ProductIntent;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class ProductExtractionService {
  private static final Pattern STORAGE = Pattern.compile("(128|256|512)\\s?gb", Pattern.CASE_INSENSITIVE);
  private static final Pattern IPHONE = Pattern.compile("iphone\\s*(\\d{1,2})(?:\\s*(pro|max|plus|mini))*", Pattern.CASE_INSENSITIVE);
  private static final Pattern SAMSUNG_S = Pattern.compile("(?:samsung\\s+)?(?:galaxy\\s+)?s(\\d{2})\\s*(ultra|plus|fe)?", Pattern.CASE_INSENSITIVE);
  private static final Pattern ONEPLUS = Pattern.compile("(?:oneplus|one\\s+plus)\\s*(\\d{1,2})\\s*(r|pro)?", Pattern.CASE_INSENSITIVE);
  private static final Pattern PIXEL = Pattern.compile("pixel\\s*(\\d{1,2})\\s*(pro|xl|a)?", Pattern.CASE_INSENSITIVE);
  private static final Pattern BUDGET = Pattern.compile("\\b(?:under|below|less\\s+than|within)\\s*(?:rs\\.?|inr|₹)?\\s*\\d+[,.]?\\d*\\b", Pattern.CASE_INSENSITIVE);

  public ProductIntent extract(String query) {
    String lower = query.toLowerCase(Locale.ROOT);
    Matcher storageMatcher = STORAGE.matcher(query);
    Matcher iphoneMatcher = IPHONE.matcher(query);
    Matcher samsungMatcher = SAMSUNG_S.matcher(query);
    Matcher onePlusMatcher = ONEPLUS.matcher(query);
    Matcher pixelMatcher = PIXEL.matcher(query);
    String storage = storageMatcher.find() ? storageMatcher.group().replace(" ", "").toUpperCase(Locale.ROOT) : "256GB";
    String color = extractColor(lower);
    String brand = extractBrand(lower);
    String productName;

    if (iphoneMatcher.find()) {
      productName = "iPhone " + iphoneMatcher.group(1) + suffix(iphoneMatcher.group(2));
      brand = "Apple";
    } else if (samsungMatcher.find()) {
      productName = "Galaxy S" + samsungMatcher.group(1) + suffix(samsungMatcher.group(2));
      brand = "Samsung";
    } else if (onePlusMatcher.find()) {
      productName = "OnePlus " + onePlusMatcher.group(1) + suffix(onePlusMatcher.group(2));
      brand = "OnePlus";
    } else if (pixelMatcher.find()) {
      productName = "Pixel " + pixelMatcher.group(1) + suffix(pixelMatcher.group(2));
      brand = "Google";
    } else {
      productName = titleCase(cleanProductName(query, storage, color, brand));
    }
    return new ProductIntent(productName, brand, query.trim(), storage, color);
  }

  private String extractBrand(String lower) {
    if (lower.contains("samsung") || lower.contains("galaxy")) return "Samsung";
    if (lower.contains("oneplus") || lower.contains("one plus")) return "OnePlus";
    if (lower.contains("pixel") || lower.contains("google")) return "Google";
    if (lower.contains("iphone") || lower.contains("apple")) return "Apple";
    if (lower.contains("vivo")) return "Vivo";
    if (lower.contains("oppo")) return "Oppo";
    if (lower.contains("xiaomi") || lower.contains("redmi")) return "Xiaomi";
    if (lower.contains("nike")) return "Nike";
    if (lower.contains("adidas")) return "Adidas";
    if (lower.contains("puma")) return "Puma";
    if (lower.contains("sony")) return "Sony";
    if (lower.contains("lg")) return "LG";
    if (lower.contains("dell")) return "Dell";
    if (lower.contains("hp")) return "HP";
    if (lower.contains("lenovo")) return "Lenovo";
    if (lower.contains("boat")) return "boAt";
    if (lower.contains("jbl")) return "JBL";
    return "Unknown";
  }

  private String extractColor(String lower) {
    if (lower.contains("blue")) return "Blue";
    if (lower.contains("white")) return "White";
    if (lower.contains("pink")) return "Pink";
    if (lower.contains("green")) return "Green";
    if (lower.contains("natural")) return "Natural";
    if (lower.contains("silver")) return "Silver";
    if (lower.contains("gold")) return "Gold";
    return "Black";
  }

  private String cleanProductName(String query, String storage, String color, String brand) {
    String cleaned = query
        .replaceAll("(?i)\\b(i\\s+want\\s+to\\s+buy|want\\s+to\\s+buy|show\\s+me|compare|buy|search|for|only)\\b", " ")
        .replaceAll(BUDGET.pattern(), " ")
        .replaceAll("(?i)\\b" + Pattern.quote(storage) + "\\b", " ")
        .replaceAll("(?i)\\b" + Pattern.quote(storage.replace("GB", " GB")) + "\\b", " ")
        .replaceAll("(?i)\\b" + Pattern.quote(color) + "\\b", " ")
        .replaceAll("(?i)\\b" + Pattern.quote(brand) + "\\b", " ")
        .replaceAll("\\s+", " ")
        .trim();
    return cleaned.isBlank() ? query.trim() : cleaned;
  }

  private String suffix(String value) {
    return value == null || value.isBlank() ? "" : " " + titleCase(value);
  }

  private String titleCase(String value) {
    String[] words = value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim().split(" ");
    StringBuilder builder = new StringBuilder();
    for (String word : words) {
      if (word.isBlank()) continue;
      if (!builder.isEmpty()) builder.append(' ');
      builder.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
    }
    return builder.isEmpty() ? "Product" : builder.toString();
  }
}
