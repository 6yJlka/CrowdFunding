package ru.donskikh.crowdfunding.security;

import ru.donskikh.crowdfunding.domain.entity.RoleEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AppUserDetailsService service;

    @Test
    void loadUserByUsernameReturnsSecurityPrincipalForActiveUser() {
        RoleEntity role = new RoleEntity();
        role.setCode(RoleCode.AUTHOR);

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        user.setPasswordHash("hash");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(Set.of(role));

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        AppUserDetails details = service.loadUserByUsername("user@example.com");

        assertThat(details.getId()).isEqualTo(user.getId());
        assertThat(details.getUsername()).isEqualTo("user@example.com");
        assertThat(details.getPassword()).isEqualTo("hash");
        assertThat(details.getAuthorities()).extracting("authority").containsExactly("ROLE_AUTHOR");
    }

    @Test
    void loadUserByUsernameRejectsInactiveUser() {
        UserEntity user = new UserEntity();
        user.setEmail("user@example.com");
        user.setStatus(UserStatus.BLOCKED);

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.loadUserByUsername("user@example.com"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessage("User not active");
    }

    @Test
    void loadUserByUsernameThrowsWhenUserDoesNotExist() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUserByUsername("missing@example.com"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessage("User not found");
    }
}
