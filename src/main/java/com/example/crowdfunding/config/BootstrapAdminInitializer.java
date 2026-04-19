package com.example.crowdfunding.config;

import com.example.crowdfunding.domain.entity.RoleEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import com.example.crowdfunding.domain.repository.RoleRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BootstrapAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminInitializer.class);

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public BootstrapAdminInitializer(BootstrapAdminProperties properties,
                                     UserRepository userRepository,
                                     RoleRepository roleRepository,
                                     PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            return;
        }

        String email = normalizeEmail(properties.getEmail());
        String password = properties.getPassword();
        String displayName = normalizeText(properties.getDisplayName());

        if (isBlank(email) || isBlank(password)) {
            log.warn("Bootstrap admin is enabled, but email/password are not fully configured. Skipping admin creation.");
            return;
        }

        if (userRepository.existsByEmail(email)) {
            log.info("Bootstrap admin already exists: {}", email);
            return;
        }

        RoleEntity adminRole = roleRepository.findByCode(RoleCode.ADMIN)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: ADMIN"));

        UserEntity admin = new UserEntity();
        admin.setEmail(email);
        admin.setDisplayName(isBlank(displayName) ? "Administrator" : displayName);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setStatus(UserStatus.ACTIVE);
        admin.getRoles().add(adminRole);

        userRepository.save(admin);
        log.info("Bootstrap admin created: {}", email);
    }

    private static String normalizeEmail(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private static String normalizeText(String value) {
        return value == null ? null : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
