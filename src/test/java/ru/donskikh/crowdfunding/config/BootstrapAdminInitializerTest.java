package ru.donskikh.crowdfunding.config;

import ru.donskikh.crowdfunding.domain.entity.RoleEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.domain.repository.RoleRepository;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BootstrapAdminInitializerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ApplicationArguments args;

    @InjectMocks
    private BootstrapAdminInitializer initializer;

    @Test
    void runSkipsWhenBootstrapDisabled() {
        BootstrapAdminProperties properties = new BootstrapAdminProperties();
        properties.setEnabled(false);
        BootstrapAdminInitializer local = new BootstrapAdminInitializer(properties, userRepository, roleRepository, passwordEncoder);

        local.run(args);

        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void runSkipsWhenCredentialsBlank() {
        BootstrapAdminProperties properties = new BootstrapAdminProperties();
        properties.setEnabled(true);
        properties.setEmail(" ");
        properties.setPassword("");
        BootstrapAdminInitializer local = new BootstrapAdminInitializer(properties, userRepository, roleRepository, passwordEncoder);

        local.run(args);

        verify(userRepository, never()).existsByEmail(any());
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void runSkipsWhenUserAlreadyExists() {
        BootstrapAdminProperties properties = new BootstrapAdminProperties();
        properties.setEnabled(true);
        properties.setEmail(" Admin@Example.com ");
        properties.setPassword("secret");
        BootstrapAdminInitializer local = new BootstrapAdminInitializer(properties, userRepository, roleRepository, passwordEncoder);

        when(userRepository.existsByEmail("admin@example.com")).thenReturn(true);

        local.run(args);

        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void runThrowsWhenAdminRoleMissing() {
        BootstrapAdminProperties properties = new BootstrapAdminProperties();
        properties.setEnabled(true);
        properties.setEmail("admin@example.com");
        properties.setPassword("secret");
        BootstrapAdminInitializer local = new BootstrapAdminInitializer(properties, userRepository, roleRepository, passwordEncoder);

        when(userRepository.existsByEmail("admin@example.com")).thenReturn(false);
        when(roleRepository.findByCode(RoleCode.ADMIN)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> local.run(args))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Role not found: ADMIN");
    }

    @Test
    void runCreatesNormalizedAdmin() {
        BootstrapAdminProperties properties = new BootstrapAdminProperties();
        properties.setEnabled(true);
        properties.setEmail(" Admin@Example.com ");
        properties.setPassword("secret");
        properties.setDisplayName("  Root Admin  ");
        BootstrapAdminInitializer local = new BootstrapAdminInitializer(properties, userRepository, roleRepository, passwordEncoder);

        RoleEntity adminRole = new RoleEntity();
        adminRole.setCode(RoleCode.ADMIN);

        when(userRepository.existsByEmail("admin@example.com")).thenReturn(false);
        when(roleRepository.findByCode(RoleCode.ADMIN)).thenReturn(Optional.of(adminRole));
        when(passwordEncoder.encode("secret")).thenReturn("encoded");

        local.run(args);

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        UserEntity admin = captor.getValue();
        assertThat(admin.getEmail()).isEqualTo("admin@example.com");
        assertThat(admin.getDisplayName()).isEqualTo("Root Admin");
        assertThat(admin.getPasswordHash()).isEqualTo("encoded");
        assertThat(admin.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(admin.getRoles()).extracting(RoleEntity::getCode).containsExactly(RoleCode.ADMIN);
    }
}
