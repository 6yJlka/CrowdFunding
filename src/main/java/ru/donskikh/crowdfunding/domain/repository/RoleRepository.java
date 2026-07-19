package ru.donskikh.crowdfunding.domain.repository;

import ru.donskikh.crowdfunding.domain.entity.RoleEntity;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<RoleEntity, Short> {
    Optional<RoleEntity> findByCode(RoleCode code);
}