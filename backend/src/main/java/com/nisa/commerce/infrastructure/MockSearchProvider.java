package com.nisa.commerce.infrastructure;

import com.nisa.commerce.domain.ProductIntent;
import com.nisa.commerce.domain.ProductOffer;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class MockSearchProvider implements SearchProvider {
  private static final Pattern BUDGET = Pattern.compile("\\b(?:under|below|less\\s+than|within)\\s*(?:rs\\.?|inr|₹)?\\s*(\\d+[,.]?\\d*)\\b", Pattern.CASE_INSENSITIVE);

  @Override
  public Mono<List<ProductOffer>> search(ProductIntent intent) {
    String category = category(intent);
    int basePrice = basePrice(intent, category);
    int budget = budget(intent);
    if (budget > 0) {
      basePrice = Math.min(basePrice, Math.max(49, budget - Math.max(10, budget / 20)));
    }
    List<ProductOffer> offers = new ArrayList<>();

    switch (category) {
      case "fashion" -> {
        String brandA = brandOr(intent, "Puma");
        offers.add(offer("Flipkart", productDisplayName(intent, category, brandA), clampToBudget(basePrice - priceDelta(basePrice, 18), budget), 10, 0, "2 days", "RetailNet", 4.4, "Exchange or coupon bonus", "Axis Bank offer", List.of("Lowest Price", "Best Bank Offer")));
        offers.add(offer("AJIO", productDisplayName(intent, category, brandOr(intent, "Red Tape")), clampToBudget(basePrice - priceDelta(basePrice, 12), budget), 11, 49, "4 days", "AJIO Fashion", 4.2, "New user coupon", "SBI discount", List.of()));
        offers.add(offer("Myntra", productDisplayName(intent, category, brandOr(intent, "Adidas")), clampToBudget(basePrice - priceDelta(basePrice, 7), budget), 12, 49, "3 days", "Brand Authorized", 4.3, "Size exchange available", "HDFC cashback", List.of()));
        offers.add(offer("Amazon", productDisplayName(intent, category, brandOr(intent, "Nike")), clampToBudget(basePrice, budget), 9, 0, "Tomorrow", "Amazon Verified", 4.5, "Fast delivery bundle", "ICICI instant discount", List.of("Fastest Delivery")));
      }
      case "appliance", "electronics", "phone" -> {
        offers.add(offer("Flipkart", productDisplayName(intent, category, fallbackBrand(intent, category, 0)), clampToBudget(basePrice - priceDelta(basePrice, 4), budget), 10, 0, "2 days", "RetailNet", 4.4, "Exchange or coupon bonus", "Axis Bank offer", List.of("Lowest Price", "Best Bank Offer")));
        offers.add(offer("Amazon", productDisplayName(intent, category, fallbackBrand(intent, category, 1)), clampToBudget(basePrice, budget), 9, 0, "Tomorrow", "Amazon Verified", 4.5, "Fast delivery bundle", "ICICI instant discount", List.of("Fastest Delivery")));
        offers.add(offer("Reliance Digital", productDisplayName(intent, category, fallbackBrand(intent, category, 2)), clampToBudget(basePrice + priceDelta(basePrice, 1), budget), 9, 49, "3 days", "Reliance Retail", 4.2, "Store pickup available", "SBI discount", List.of()));
        offers.add(offer("Croma", productDisplayName(intent, category, fallbackBrand(intent, category, 3)), clampToBudget(basePrice + priceDelta(basePrice, 3), budget), 8, 99, "Tomorrow", "Croma Retail", 4.3, "Free setup support", "HDFC cashback", List.of()));
        if (intent.brand().equals("Apple")) {
          String name = productDisplayName(intent, category, null);
          offers.add(offer("Apple Store", name, clampToBudget(basePrice + priceDelta(basePrice, 16), budget), 0, 0, "Tomorrow", "Apple India", 4.9, "Personal setup and trade-in", "Selected cards EMI", List.of("Trusted Seller")));
        }
      }
      case "grocery" -> {
        String name = productDisplayName(intent, category, null);
        offers.add(offer("Flipkart", name, clampToBudget(basePrice - priceDelta(basePrice, 4), budget), 10, 0, "2 days", "RetailNet", 4.4, "Exchange or coupon bonus", "Axis Bank offer", List.of("Lowest Price", "Best Bank Offer")));
        offers.add(offer("Amazon", name, clampToBudget(basePrice, budget), 9, 0, "Tomorrow", "Amazon Verified", 4.5, "Fast delivery bundle", "ICICI instant discount", List.of("Fastest Delivery")));
        offers.add(offer("JioMart", name, clampToBudget(basePrice - priceDelta(basePrice, 1), budget), 7, 19, "Tomorrow", "JioMart", 4.1, "Basket coupon", "UPI cashback", List.of()));
        offers.add(offer("BigBasket", name, clampToBudget(basePrice + priceDelta(basePrice, 2), budget), 6, 29, "Today", "BigBasket", 4.2, "Freshness guarantee", "Wallet cashback", List.of()));
      }
      case "personal_care" -> {
        offers.add(offer("Amazon", productDisplayName(intent, category, fallbackBrand(intent, category, 0)), clampToBudget(basePrice - priceDelta(basePrice, 9), budget), 12, 0, "Tomorrow", "Amazon Verified", 4.4, "Subscribe and save coupon", "ICICI instant discount", List.of("Lowest Price", "Fastest Delivery")));
        offers.add(offer("Flipkart", productDisplayName(intent, category, fallbackBrand(intent, category, 1)), clampToBudget(basePrice - priceDelta(basePrice, 5), budget), 10, 0, "2 days", "RetailNet", 4.3, "Combo pack offer", "Axis Bank offer", List.of("Best Bank Offer")));
        offers.add(offer("Tata 1mg", productDisplayName(intent, category, fallbackBrand(intent, category, 2)), clampToBudget(basePrice, budget), 8, 29, "2 days", "Tata 1mg", 4.2, "Health store coupon", "UPI cashback", List.of()));
        offers.add(offer("PharmEasy", productDisplayName(intent, category, fallbackBrand(intent, category, 3)), clampToBudget(basePrice + priceDelta(basePrice, 4), budget), 7, 29, "3 days", "PharmEasy", 4.1, "Care coupon", "Wallet cashback", List.of()));
      }
      case "book" -> {
        String name = productDisplayName(intent, category, null);
        offers.add(offer("Flipkart", name, clampToBudget(basePrice - priceDelta(basePrice, 4), budget), 10, 0, "2 days", "RetailNet", 4.4, "Exchange or coupon bonus", "Axis Bank offer", List.of("Lowest Price", "Best Bank Offer")));
        offers.add(offer("Amazon", name, clampToBudget(basePrice, budget), 9, 0, "Tomorrow", "Amazon Verified", 4.5, "Fast delivery bundle", "ICICI instant discount", List.of("Fastest Delivery")));
        offers.add(offer("Bookswagon", name, clampToBudget(basePrice - priceDelta(basePrice, 2), budget), 5, 39, "4 days", "Bookswagon", 4.4, "Publisher edition", "Card cashback", List.of()));
        offers.add(offer("SapnaOnline", name, clampToBudget(basePrice + priceDelta(basePrice, 1), budget), 4, 49, "5 days", "SapnaOnline", 4.1, "Packed shipping", "Wallet offer", List.of()));
      }
      default -> {
        String name = productDisplayName(intent, category, null);
        offers.add(offer("Flipkart", name, clampToBudget(basePrice - priceDelta(basePrice, 4), budget), 10, 0, "2 days", "RetailNet", 4.4, "Exchange or coupon bonus", "Axis Bank offer", List.of("Lowest Price", "Best Bank Offer")));
        offers.add(offer("Amazon", name, clampToBudget(basePrice, budget), 9, 0, "Tomorrow", "Amazon Verified", 4.5, "Fast delivery bundle", "ICICI instant discount", List.of("Fastest Delivery")));
        offers.add(offer("Meesho", name, clampToBudget(basePrice - priceDelta(basePrice, 5), budget), 13, 59, "5 days", "Meesho Seller", 4.0, "Seller coupon", "UPI cashback", List.of()));
        offers.add(offer("Tata CLiQ", name, clampToBudget(basePrice + priceDelta(basePrice, 2), budget), 8, 49, "3 days", "Tata CLiQ", 4.2, "CLiQ luxury coupon", "NeuCard offer", List.of()));
      }
    }

    return Mono.just(offers);
  }

  private String productDisplayName(ProductIntent intent, String category, String fallbackBrand) {
    String colorAndStorage = category.equals("phone")
        ? "%s %s".formatted(intent.storage(), intent.color())
        : "";
    String brand = intent.brand().equals("Unknown") ? fallbackBrand == null ? "" : fallbackBrand : intent.brand();
    return "%s %s %s".formatted(brand, intent.productName(), colorAndStorage).replaceAll("\\s+", " ").trim();
  }

  private String brandOr(ProductIntent intent, String fallbackBrand) {
    return intent.brand().equals("Unknown") ? fallbackBrand : intent.brand();
  }

  private String fallbackBrand(ProductIntent intent, String category, int index) {
    if (!intent.brand().equals("Unknown")) return intent.brand();
    String text = "%s %s".formatted(intent.productName(), intent.variant()).toLowerCase();
    String[] brands;
    if (category.equals("phone")) {
      brands = new String[] {"Samsung", "OnePlus", "Apple", "Google"};
    } else if (text.contains("fridge") || text.contains("refrigerator")) {
      brands = new String[] {"Whirlpool", "Samsung", "LG", "Godrej"};
    } else if (text.contains("tv")) {
      brands = new String[] {"Mi", "Samsung", "LG", "Sony"};
    } else if (text.contains("laptop")) {
      brands = new String[] {"Lenovo", "HP", "Dell", "ASUS"};
    } else if (text.contains("headphone") || text.contains("earbud")) {
      brands = new String[] {"boAt", "JBL", "Sony", "OnePlus"};
    } else if (category.equals("personal_care")) {
      brands = personalCareBrands(text);
    } else {
      brands = category.equals("appliance")
          ? new String[] {"LG", "Samsung", "Whirlpool", "Bosch"}
          : new String[] {"Lenovo", "Samsung", "Sony", "HP"};
    }
    return brands[Math.min(index, brands.length - 1)];
  }

  private String category(ProductIntent intent) {
    String text = "%s %s %s".formatted(intent.productName(), intent.brand(), intent.variant()).toLowerCase();
    if (text.contains("iphone") || text.contains("galaxy") || text.contains("oneplus") || text.contains("pixel") || text.contains("phone") || text.contains("mobile")) return "phone";
    if (text.contains("laptop") || text.contains("macbook") || text.contains("tablet") || text.contains("ipad") || text.contains("headphone") || text.contains("earbud") || text.contains("camera") || text.contains("watch")) return "electronics";
    if (text.contains("tv") || text.contains("refrigerator") || text.contains("fridge") || text.contains("washing machine") || text.contains("ac ") || text.contains("air conditioner") || text.contains("microwave")) return "appliance";
    if (text.contains("shoe") || text.contains("shirt") || text.contains("jeans") || text.contains("dress") || text.contains("jacket") || text.contains("sneaker")) return "fashion";
    if (text.contains("rice") || text.contains("oil") || text.contains("atta") || text.contains("milk") || text.contains("coffee") || text.contains("tea")) return "grocery";
    if (text.contains("condom") || text.contains("sanitary") || text.contains("pad") || text.contains("toothpaste") || text.contains("soap") || text.contains("shampoo") || text.contains("face wash") || text.contains("deodorant") || text.contains("razor")) return "personal_care";
    if (text.contains("book") || text.contains("novel")) return "book";
    return "general";
  }

  private int basePrice(ProductIntent intent, String category) {
    String text = "%s %s %s".formatted(intent.productName(), intent.brand(), intent.variant()).toLowerCase();
    int price = switch (category) {
      case "phone" -> 72490;
      case "electronics" -> text.contains("laptop") || text.contains("macbook") ? 64990 : text.contains("watch") ? 14990 : 8990;
      case "appliance" -> text.contains("tv") ? 45990 : text.contains("refrigerator") || text.contains("fridge") ? 52990 : 32990;
      case "fashion" -> 1999;
      case "grocery" -> groceryPrice(text);
      case "personal_care" -> personalCarePrice(text);
      case "book" -> 699;
      default -> generalProductPrice(text);
    };
    if (text.contains("pro") || text.contains("ultra") || text.contains("max")) price += priceDelta(price, 12);
    if (text.contains("iphone 16") || text.contains("s26") || text.contains("pixel 9")) price += 7000;
    if (text.contains("iphone 14") || text.contains("s23") || text.contains("pixel 7")) price -= 8000;
    if (intent.brand().equals("OnePlus")) price -= 12000;
    if (intent.brand().equals("Google")) price -= 6000;
    return Math.max(399, price);
  }

  private int budget(ProductIntent intent) {
    Matcher matcher = BUDGET.matcher(intent.variant());
    if (!matcher.find()) return 0;
    return Integer.parseInt(matcher.group(1).replaceAll("[,.]", ""));
  }

  private int clampToBudget(int price, int budget) {
    if (budget <= 0 || price <= budget) return Math.max(49, price);
    return Math.max(49, budget - Math.max(10, budget / 20));
  }

  private int priceDelta(int price, int percentage) {
    return Math.max(10, Math.round(price * percentage / 100f));
  }

  private String[] personalCareBrands(String text) {
    if (text.contains("condom")) return new String[] {"Durex", "Skore", "Manforce", "Moods"};
    if (text.contains("sanitary") || text.contains("pad")) return new String[] {"Whisper", "Stayfree", "Sofy", "Niine"};
    if (text.contains("toothpaste")) return new String[] {"Colgate", "Sensodyne", "Closeup", "Pepsodent"};
    if (text.contains("shampoo")) return new String[] {"Dove", "L'Oreal", "Head & Shoulders", "Tresemme"};
    if (text.contains("soap")) return new String[] {"Dove", "Pears", "Dettol", "Lux"};
    if (text.contains("razor")) return new String[] {"Gillette", "Bombay Shaving Company", "LetsShave", "SuperMax"};
    return new String[] {"Himalaya", "Nivea", "Dove", "Pears"};
  }

  private int personalCarePrice(String text) {
    if (text.contains("condom")) return packAwarePrice(text, 249);
    if (text.contains("sanitary") || text.contains("pad")) return packAwarePrice(text, 179);
    if (text.contains("toothpaste")) return 129;
    if (text.contains("soap")) return packAwarePrice(text, 159);
    if (text.contains("shampoo")) return text.contains("1 l") || text.contains("1l") ? 599 : 299;
    if (text.contains("face wash")) return 199;
    if (text.contains("deodorant")) return 249;
    if (text.contains("razor")) return 299;
    return 249;
  }

  private int groceryPrice(String text) {
    if (text.contains("rice")) return text.contains("10") ? 799 : 399;
    if (text.contains("oil")) return 179;
    if (text.contains("atta")) return text.contains("10") ? 489 : 259;
    if (text.contains("milk")) return 72;
    if (text.contains("coffee")) return 349;
    if (text.contains("tea")) return 249;
    return 299;
  }

  private int generalProductPrice(String text) {
    if (text.contains("bottle")) return 399;
    if (text.contains("bag") || text.contains("backpack")) return 899;
    if (text.contains("chair")) return 2999;
    if (text.contains("toy")) return 599;
    if (text.contains("charger") || text.contains("cable")) return 499;
    if (text.contains("cover") || text.contains("case")) return 299;
    return 1499;
  }

  private int packAwarePrice(String text, int defaultPrice) {
    Matcher matcher = Pattern.compile("\\b(3|6|10|12|20|30|40|50)\\b").matcher(text);
    if (!matcher.find()) return defaultPrice;
    int pack = Integer.parseInt(matcher.group(1));
    return switch (pack) {
      case 3 -> Math.max(99, defaultPrice - 110);
      case 6 -> Math.max(149, defaultPrice - 60);
      case 10, 12 -> defaultPrice;
      case 20 -> defaultPrice + 140;
      case 30 -> defaultPrice + 240;
      default -> defaultPrice + 360;
    };
  }

  private ProductOffer offer(String platform, String name, int price, int discount, int deliveryCharges, String delivery,
      String seller, double rating, String offer, String bankOffer, List<String> badges) {
    return new ProductOffer(platform, name, price, discount, deliveryCharges, delivery, seller, rating, List.of(offer),
        List.of(bankOffer), "Exchange available after device inspection", "No-cost EMI from Rs. 3,499/month",
        "1 year manufacturer warranty", "In stock", platformUrl(platform, name), 0, badges);
  }

  private String platformUrl(String platform, String productName) {
    String encoded = URLEncoder.encode(productName, StandardCharsets.UTF_8);
    return switch (platform) {
      case "Amazon" -> "https://www.amazon.in/s?k=" + encoded;
      case "Flipkart" -> "https://www.flipkart.com/search?q=" + encoded;
      case "Croma" -> "https://www.croma.com/search/?text=" + encoded;
      case "Reliance Digital" -> "https://www.reliancedigital.in/search?q=" + encoded;
      case "Apple Store" -> "https://www.apple.com/in/search/" + encoded.replace("+", "%20") + "?src=globalnav";
      case "Myntra" -> "https://www.myntra.com/" + encoded.replace("+", "-");
      case "AJIO" -> "https://www.ajio.com/search/?text=" + encoded;
      case "BigBasket" -> "https://www.bigbasket.com/ps/?q=" + encoded;
      case "JioMart" -> "https://www.jiomart.com/search/" + encoded;
      case "Tata 1mg" -> "https://www.1mg.com/search/all?name=" + encoded;
      case "PharmEasy" -> "https://pharmeasy.in/search/all?name=" + encoded;
      case "Bookswagon" -> "https://www.bookswagon.com/search-books/" + encoded;
      case "SapnaOnline" -> "https://www.sapnaonline.com/search?keyword=" + encoded;
      case "Meesho" -> "https://www.meesho.com/search?q=" + encoded;
      case "Tata CLiQ" -> "https://www.tatacliq.com/search/?searchCategory=all&text=" + encoded;
      default -> "https://www.google.com/search?q=" + encoded;
    };
  }
}
