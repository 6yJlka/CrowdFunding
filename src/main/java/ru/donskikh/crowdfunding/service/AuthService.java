package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.api.dto.AuthResponse;
import ru.donskikh.crowdfunding.api.dto.LoginRequest;
import ru.donskikh.crowdfunding.api.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest req);
    AuthResponse login(LoginRequest req);
}