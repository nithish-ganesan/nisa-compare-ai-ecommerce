package com.nisa.commerce.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();
  private static final String ISSUER = "nisa-commerce-engine";
  private static final String AUDIENCE = "nisa-compare-portal";
  private static final long TOKEN_TTL_SECONDS = 86_400;

  private final Map<String, UserAccount> usersByLogin = new ConcurrentHashMap<>();
  private final Map<String, SessionUser> activeSessionsByJwtId = new ConcurrentHashMap<>();
  private final byte[] jwtSecret;

  public AuthService(@Value("${nisa.security.jwt-secret:}") String configuredJwtSecret) {
    this.jwtSecret = configuredJwtSecret == null || configuredJwtSecret.isBlank()
        ? newJwtSecret()
        : configuredJwtSecret.getBytes(StandardCharsets.UTF_8);
    if (this.jwtSecret.length < 32) {
      throw new IllegalStateException("NISA_JWT_SECRET must be at least 32 characters for public deployments.");
    }
  }

  public AuthResult register(String username, String email, String password) {
    String normalizedUsername = normalize(username);
    String normalizedEmail = normalize(email);
    validateCredentials(normalizedUsername, normalizedEmail, password);
    if (usersByLogin.containsKey(normalizedUsername) || usersByLogin.containsKey(normalizedEmail)) {
      throw new IllegalArgumentException("Account already exists. Please login with your username or email.");
    }

    UserAccount account = new UserAccount(normalizedUsername, normalizedEmail, hash(password), Instant.now());
    usersByLogin.put(normalizedUsername, account);
    usersByLogin.put(normalizedEmail, account);
    return createSession(account);
  }

  public AuthResult login(String login, String password) {
    UserAccount account = usersByLogin.get(normalize(login));
    if (account == null || !verify(password, account.passwordHash())) {
      throw new IllegalArgumentException("Invalid username/email or password.");
    }
    return createSession(account);
  }

  public SessionUser currentUser(String authorizationHeader) {
    return requireSession(authorizationHeader);
  }

  public void logout(String authorizationHeader) {
    JwtClaims claims = validateJwt(bearerToken(authorizationHeader));
    activeSessionsByJwtId.remove(claims.jwtId());
  }

  public SessionUser requireSession(String authorizationHeader) {
    JwtClaims claims = validateJwt(bearerToken(authorizationHeader));
    SessionUser session = activeSessionsByJwtId.get(claims.jwtId());
    if (session == null) {
      throw new IllegalArgumentException("Authentication required.");
    }
    return session;
  }

  private AuthResult createSession(UserAccount account) {
    Instant now = Instant.now();
    Instant expiresAt = now.plusSeconds(TOKEN_TTL_SECONDS);
    String jwtId = UUID.randomUUID().toString();
    SessionUser user = new SessionUser(account.username(), account.email());
    activeSessionsByJwtId.put(jwtId, user);
    String token = signJwt(account.username(), account.email(), jwtId, now, expiresAt);
    return new AuthResult(token, user.username(), user.email(), expiresAt.getEpochSecond());
  }

  private String signJwt(String username, String email, String jwtId, Instant issuedAt, Instant expiresAt) {
    String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    String payload = "{"
        + "\"iss\":\"" + ISSUER + "\","
        + "\"aud\":\"" + AUDIENCE + "\","
        + "\"sub\":\"" + escape(username) + "\","
        + "\"email\":\"" + escape(email) + "\","
        + "\"jti\":\"" + jwtId + "\","
        + "\"iat\":" + issuedAt.getEpochSecond() + ","
        + "\"exp\":" + expiresAt.getEpochSecond()
        + "}";
    String signingInput = base64Url(header.getBytes(StandardCharsets.UTF_8)) + "."
        + base64Url(payload.getBytes(StandardCharsets.UTF_8));
    return signingInput + "." + base64Url(hmac(signingInput));
  }

  private JwtClaims validateJwt(String token) {
    String[] parts = token.split("\\.");
    if (parts.length != 3) throw new IllegalArgumentException("Invalid token.");
    String signingInput = parts[0] + "." + parts[1];
    byte[] expected = hmac(signingInput);
    byte[] actual = URL_DECODER.decode(parts[2]);
    if (!MessageDigest.isEqual(expected, actual)) throw new IllegalArgumentException("Invalid token signature.");

    String payload = new String(URL_DECODER.decode(parts[1]), StandardCharsets.UTF_8);
    JwtClaims claims = new JwtClaims(
        jsonValue(payload, "iss"),
        jsonValue(payload, "aud"),
        jsonValue(payload, "sub"),
        jsonValue(payload, "email"),
        jsonValue(payload, "jti"),
        longValue(payload, "iat"),
        longValue(payload, "exp")
    );
    long now = Instant.now().getEpochSecond();
    if (!ISSUER.equals(claims.issuer())) throw new IllegalArgumentException("Invalid token issuer.");
    if (!AUDIENCE.equals(claims.audience())) throw new IllegalArgumentException("Invalid token audience.");
    if (claims.issuedAt() > now + 60) throw new IllegalArgumentException("Invalid token issued time.");
    if (claims.expiresAt() <= now) throw new IllegalArgumentException("Session expired. Please login again.");
    return claims;
  }

  private byte[] hmac(String input) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(jwtSecret, "HmacSHA256"));
      return mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
    } catch (Exception exception) {
      throw new IllegalStateException("JWT signing is unavailable.", exception);
    }
  }

  private String hash(String password) {
    byte[] salt = new byte[16];
    RANDOM.nextBytes(salt);
    byte[] hash = pbkdf(password.toCharArray(), salt);
    return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
  }

  private boolean verify(String password, String storedHash) {
    String[] parts = storedHash.split(":");
    if (parts.length != 2) return false;
    byte[] salt = Base64.getDecoder().decode(parts[0]);
    byte[] expected = Base64.getDecoder().decode(parts[1]);
    byte[] actual = pbkdf(password.toCharArray(), salt);
    return MessageDigest.isEqual(expected, actual);
  }

  private byte[] pbkdf(char[] password, byte[] salt) {
    try {
      KeySpec spec = new PBEKeySpec(password, salt, 210_000, 256);
      return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
    } catch (NoSuchAlgorithmException | InvalidKeySpecException exception) {
      throw new IllegalStateException("Password hashing is unavailable.", exception);
    }
  }

  private String bearerToken(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      throw new IllegalArgumentException("Authentication required.");
    }
    return authorizationHeader.substring("Bearer ".length()).trim();
  }

  private void validateCredentials(String username, String email, String password) {
    if (!username.matches("[a-z0-9._-]{3,32}")) {
      throw new IllegalArgumentException("Username must be 3-32 characters and use letters, numbers, dot, underscore, or hyphen.");
    }
    if (!email.matches("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$")) {
      throw new IllegalArgumentException("Enter a valid email address.");
    }
    if (password == null || password.length() < 10 || !password.matches(".*[A-Za-z].*") || !password.matches(".*\\d.*")) {
      throw new IllegalArgumentException("Password must be at least 10 characters and include letters and numbers.");
    }
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private String base64Url(byte[] value) {
    return URL_ENCODER.encodeToString(value);
  }

  private byte[] newJwtSecret() {
    byte[] secret = new byte[64];
    RANDOM.nextBytes(secret);
    return secret;
  }

  private String jsonValue(String json, String key) {
    String pattern = "\"" + key + "\":\"";
    int start = json.indexOf(pattern);
    if (start < 0) return "";
    start += pattern.length();
    int end = json.indexOf('"', start);
    return end < 0 ? "" : json.substring(start, end).replace("\\\"", "\"").replace("\\\\", "\\");
  }

  private long longValue(String json, String key) {
    String pattern = "\"" + key + "\":";
    int start = json.indexOf(pattern);
    if (start < 0) return 0;
    start += pattern.length();
    int end = start;
    while (end < json.length() && Character.isDigit(json.charAt(end))) end++;
    return Long.parseLong(json.substring(start, end));
  }

  private String escape(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }

  private record UserAccount(String username, String email, String passwordHash, Instant createdAt) {}

  private record JwtClaims(String issuer, String audience, String username, String email, String jwtId, long issuedAt, long expiresAt) {}

  public record SessionUser(String username, String email) {}

  public record AuthResult(String token, String username, String email, long expiresAt) {}
}
