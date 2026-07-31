package com.nisa.commerce.api;

import com.nisa.commerce.application.ComparisonEngine;
import com.nisa.commerce.application.AuthService;
import com.nisa.commerce.domain.ComparisonResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1")
public class ComparisonController {
  private final ComparisonEngine comparisonEngine;
  private final AuthService authService;

  public ComparisonController(ComparisonEngine comparisonEngine, AuthService authService) {
    this.comparisonEngine = comparisonEngine;
    this.authService = authService;
  }

  @PostMapping("/compare")
  public Mono<ComparisonResponse> compare(@RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody SearchRequest request) {
    authService.requireSession(authorization);
    return comparisonEngine.compare(request.query());
  }

  public record SearchRequest(@NotBlank String query) {}
}
