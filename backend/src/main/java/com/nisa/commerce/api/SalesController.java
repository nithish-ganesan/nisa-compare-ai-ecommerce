package com.nisa.commerce.api;

import com.nisa.commerce.application.AuthService;
import com.nisa.commerce.application.SaleDiscoveryService;
import com.nisa.commerce.domain.SaleEvent;
import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1")
public class SalesController {
  private final SaleDiscoveryService saleDiscoveryService;
  private final AuthService authService;

  public SalesController(SaleDiscoveryService saleDiscoveryService, AuthService authService) {
    this.saleDiscoveryService = saleDiscoveryService;
    this.authService = authService;
  }

  @GetMapping("/sales")
  public Mono<List<SaleEvent>> sales(@RequestHeader(value = "Authorization", required = false) String authorization) {
    authService.requireSession(authorization);
    return saleDiscoveryService.dailySales();
  }
}
