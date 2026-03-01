package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.AuthResponse;
import com.example.crowdfunding.api.dto.LoginRequest;
import com.example.crowdfunding.api.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest req);
    AuthResponse login(LoginRequest req);
}