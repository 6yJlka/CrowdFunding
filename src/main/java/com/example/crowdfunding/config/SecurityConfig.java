package com.example.crowdfunding.config;

import com.example.crowdfunding.security.JwtAuthFilter;
import com.example.crowdfunding.security.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint((req, res, ex) -> res.sendError(HttpStatus.UNAUTHORIZED.value()))
                        .accessDeniedHandler((req, res, ex) -> res.sendError(HttpStatus.FORBIDDEN.value()))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/auth.html",
                                "/admin-dashboard.html",
                                "/author-dashboard.html",
                                "/create-project.html",
                                "/edit-project.html",
                                "/funded-projects.html",
                                "/pay.html",
                                "/project.html",
                                "/projects.html",
                                "/sponsor-dashboard.html",
                                "/styles.css",
                                "/shell.js",
                                "/app.js",
                                "/admin-dashboard-app.js",
                                "/auth-app.js",
                                "/catalog-browser-app.js",
                                "/pay-app.js",
                                "/sponsor-dashboard-app.js",
                                "/create-project-app.js",
                                "/edit-project-app.js",
                                "/author-dashboard-app.js",
                                "/project-app.js"
                        ).permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/categories").permitAll()
                        .requestMatchers("/api/dashboard").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/projects/{projectId}/reviews").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/projects/**").permitAll()
                        .requestMatchers("/api/payments/webhook/**").permitAll()
                        .requestMatchers("/pay/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
