package ru.donskikh.crowdfunding.security;

import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public AppUserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserEntity u = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (u.getStatus() != UserStatus.ACTIVE) {
            throw new UsernameNotFoundException("User not active");
        }

        var auth = u.getRoles().stream()
                .map(r -> AppUserDetails.role(r.getCode().name()))
                .collect(Collectors.toSet());

        return new AppUserDetails(u.getId(), u.getEmail(), u.getPasswordHash(), auth);
    }
}