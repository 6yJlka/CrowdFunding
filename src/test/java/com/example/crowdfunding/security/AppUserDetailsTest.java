package com.example.crowdfunding.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AppUserDetailsTest {

    @Test
    void roleAddsSpringSecurityPrefix() {
        assertThat(AppUserDetails.role("ADMIN")).isEqualTo(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    void userDetailsContractReturnsStoredValues() {
        UUID id = UUID.randomUUID();
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_AUTHOR"));
        AppUserDetails details = new AppUserDetails(id, "user@example.com", "hash", authorities);

        assertThat(details.getId()).isEqualTo(id);
        assertThat(details.getUsername()).isEqualTo("user@example.com");
        assertThat(details.getPassword()).isEqualTo("hash");
        assertThat(details.getAuthorities()).extracting("authority").containsExactly("ROLE_AUTHOR");
        assertThat(details.isAccountNonExpired()).isTrue();
        assertThat(details.isAccountNonLocked()).isTrue();
        assertThat(details.isCredentialsNonExpired()).isTrue();
        assertThat(details.isEnabled()).isTrue();
    }
}
