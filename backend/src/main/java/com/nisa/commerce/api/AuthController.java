package com.nisa.commerce.api;

import com.nisa.commerce.application.AuthService;
import com.nisa.commerce.application.AuthService.AuthResult;
import com.nisa.commerce.application.AuthService.SessionUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  public Mono<AuthResult> register(@Valid @RequestBody RegisterRequest request) {
    return Mono.just(authService.register(request.username(), request.email(), request.password()));
  }

  @PostMapping("/login")
  public Mono<AuthResult> login(@Valid @RequestBody LoginRequest request) {
    return Mono.just(authService.login(request.login(), request.password()));
  }

  @GetMapping("/me")
  public Mono<SessionUser> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
    return Mono.just(authService.currentUser(authorization));
  }

  @PostMapping("/logout")
  public Mono<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
    authService.logout(authorization);
    return Mono.empty();
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleAuthError(IllegalArgumentException exception) {
    return new ErrorResponse(exception.getMessage());
  }

  public record RegisterRequest(@NotBlank String username, @Email String email, @NotBlank String password) {}
  public record LoginRequest(@NotBlank String login, @NotBlank String password) {}
  public record ErrorResponse(String message) {}
}
