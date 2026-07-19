package ru.donskikh.crowdfunding.domain.repository;

import ru.donskikh.crowdfunding.domain.entity.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {
    Optional<CategoryEntity> findBySlug(String slug);
    boolean existsBySlug(String slug);
    List<CategoryEntity> findByActiveTrueOrderByTitleAsc();
}
