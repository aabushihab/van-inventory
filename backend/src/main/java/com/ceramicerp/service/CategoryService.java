package com.ceramicerp.service;

import com.ceramicerp.dto.CategoryDto;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.Category;
import com.ceramicerp.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryDto> findAll() {
        return categoryRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public CategoryDto create(CategoryDto dto) {
        Category parent = dto.parentId() != null
                ? categoryRepository.findById(dto.parentId()).orElseThrow(() -> ApiException.notFound("التصنيف الأب غير موجود"))
                : null;
        Category category = Category.builder().name(dto.name()).nameEn(dto.nameEn()).parent(parent).active(true).build();
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto update(Long id, CategoryDto dto) {
        Category category = getOrThrow(id);
        Category parent = dto.parentId() != null
                ? categoryRepository.findById(dto.parentId()).orElseThrow(() -> ApiException.notFound("التصنيف الأب غير موجود"))
                : null;
        category.setName(dto.name());
        category.setNameEn(dto.nameEn());
        category.setParent(parent);
        category.setActive(dto.active());
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        categoryRepository.delete(getOrThrow(id));
    }

    private Category getOrThrow(Long id) {
        return categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("التصنيف غير موجود"));
    }

    private CategoryDto toDto(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getNameEn(),
                c.getParent() != null ? c.getParent().getId() : null,
                c.getParent() != null ? c.getParent().getName() : null,
                c.isActive());
    }
}
