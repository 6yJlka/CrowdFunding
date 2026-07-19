package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.CategoryResponse;
import ru.donskikh.crowdfunding.domain.repository.CategoryRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findByActiveTrueOrderByTitleAsc().stream()
                .map(category -> {
                    CategoryResponse response = new CategoryResponse();
                    response.setId(category.getId());
                    response.setSlug(category.getSlug());
                    response.setTitle(category.getTitle());
                    return response;
                })
                .toList();
    }
}
