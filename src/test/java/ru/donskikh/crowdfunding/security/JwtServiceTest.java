package ru.donskikh.crowdfunding.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    @Test
    void generateParseAndExtractUserId() {
        JwtService jwtService = new JwtService(
                "CHANGE_ME_TO_LONG_RANDOM_SECRET_CHANGE_ME_TO_LONG_RANDOM_SECRET",
                120
        );
        UUID userId = UUID.randomUUID();

        String token = jwtService.generate(userId, "user@example.com", List.of("AUTHOR", "SPONSOR"));
        Claims claims = jwtService.parse(token);

        assertThat(jwtService.getUserId(claims)).isEqualTo(userId);
        assertThat(claims.get("email", String.class)).isEqualTo("user@example.com");
        assertThat(claims.get("roles", List.class)).containsExactly("AUTHOR", "SPONSOR");
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }
}
