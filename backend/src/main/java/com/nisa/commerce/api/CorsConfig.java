package com.nisa.commerce.api;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.config.CorsRegistry;
import org.springframework.web.reactive.config.WebFluxConfigurer;

@Configuration
public class CorsConfig implements WebFluxConfigurer {
  private final List<String> allowedOrigins;

  public CorsConfig(@Value("${nisa.cors.allowed-origins:http://127.0.0.1:5175,http://localhost:5175}") List<String> allowedOrigins) {
    this.allowedOrigins = allowedOrigins;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins(allowedOrigins.toArray(String[]::new))
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders("Authorization", "Content-Type")
        .maxAge(3600);
  }
}
