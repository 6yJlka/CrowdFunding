package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.domain.entity.CategoryEntity;
import com.example.crowdfunding.domain.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryController controller;

    @Test
    void mapsActiveCategoriesToResponse() {
        CategoryEntity category = new CategoryEntity();
        category.setId(1L);
        category.setSlug("tech");
        category.setTitle("Technology");

        when(categoryRepository.findByActiveTrueOrderByTitleAsc()).thenReturn(List.of(category));

        var result = controller.getActiveCategories();

        assertThat(result).singleElement().satisfies(item -> {
            assertThat(item.getId()).isEqualTo(1L);
            assertThat(item.getSlug()).isEqualTo("tech");
            assertThat(item.getTitle()).isEqualTo("Technology");
        });
    }
}
