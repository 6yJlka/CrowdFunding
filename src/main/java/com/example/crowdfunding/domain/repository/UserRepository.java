package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {"roles"})
    Page<UserEntity> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = {"roles"})
    @Query("""
            select u
            from UserEntity u
            where (:q is null or :q = '' or lower(u.email) like lower(concat(:q, '%')) or lower(u.displayName) like lower(concat(:q, '%')))
              and (:status is null or u.status = :status)
            """)
    Page<UserEntity> findAllByQuery(String q, UserStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"roles"})
    Optional<UserEntity> findWithRolesById(UUID id);
}
