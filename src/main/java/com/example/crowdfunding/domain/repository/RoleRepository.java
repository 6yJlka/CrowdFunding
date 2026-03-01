package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.RoleEntity;
import com.example.crowdfunding.domain.enums.RoleCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<RoleEntity, Short> {
    Optional<RoleEntity> findByCode(RoleCode code);
}