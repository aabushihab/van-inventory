package com.vanerp.service;

import com.vanerp.dto.ProductDto;
import com.vanerp.dto.ProductUpsertRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.Category;
import com.vanerp.model.Product;
import com.vanerp.model.Unit;
import com.vanerp.repository.CategoryRepository;
import com.vanerp.repository.ProductRepository;
import com.vanerp.repository.StockItemRepository;
import com.vanerp.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final StockItemRepository stockItemRepository;

    @Transactional(readOnly = true)
    public Page<ProductDto> search(String q, Long categoryId, boolean activeOnly, Pageable pageable) {
        return productRepository.search(q, categoryId, activeOnly, pageable).map(this::toDto);
    }

    /** أصناف مخزن معيّن فقط، والمخزون المعروض هو كمية ذلك المخزن (لا يكشف مخزون المستودعات الأخرى). */
    @Transactional(readOnly = true)
    public Page<ProductDto> searchInWarehouse(String q, Long categoryId, Long warehouseId, Pageable pageable) {
        return productRepository.searchInWarehouse(q, categoryId, warehouseId, pageable)
                .map(p -> toDto(p, stockItemRepository.findByProductIdAndWarehouseId(p.getId(), warehouseId)
                        .map(si -> si.getQuantity()).orElse(BigDecimal.ZERO)));
    }

    @Transactional(readOnly = true)
    public ProductDto findInWarehouse(Long id, Long warehouseId) {
        BigDecimal qty = stockItemRepository.findByProductIdAndWarehouseId(id, warehouseId)
                .map(si -> si.getQuantity()).orElse(BigDecimal.ZERO);
        if (qty.signum() <= 0) throw ApiException.notFound("المنتج غير موجود على سيارتك");
        return toDto(getOrThrow(id), qty);
    }

    @Transactional(readOnly = true)
    public ProductDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public ProductDto create(ProductUpsertRequest request) {
        if (productRepository.existsBySku(request.sku())) {
            throw ApiException.conflict("رمز المنتج (SKU) مستخدم مسبقاً");
        }
        if (request.barcode() != null && !request.barcode().isBlank() && productRepository.existsByBarcode(request.barcode())) {
            throw ApiException.conflict("الباركود مستخدم مسبقاً لمنتج آخر");
        }
        Unit unit = unitRepository.findById(request.unitId())
                .orElseThrow(() -> ApiException.notFound("وحدة القياس غير موجودة"));
        Category category = request.categoryId() != null
                ? categoryRepository.findById(request.categoryId()).orElseThrow(() -> ApiException.notFound("التصنيف غير موجود"))
                : null;

        Product product = Product.builder()
                .sku(request.sku())
                .barcode(blankToNull(request.barcode()))
                .name(request.name())
                .nameEn(request.nameEn())
                .category(category)
                .unit(unit)
                .unitsPerCarton(request.unitsPerCarton())
                .purchasePrice(request.purchasePrice())
                .salePrice(request.salePrice())
                .taxRate(request.taxRate() != null ? request.taxRate() : BigDecimal.ZERO)
                .minStockThreshold(request.minStockThreshold() != null ? request.minStockThreshold() : BigDecimal.ZERO)
                .imageUrl(request.imageUrl())
                .active(request.active() == null || request.active())
                .build();

        return toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto update(Long id, ProductUpsertRequest request) {
        Product product = getOrThrow(id);

        productRepository.findBySku(request.sku()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) throw ApiException.conflict("رمز المنتج (SKU) مستخدم مسبقاً");
        });
        if (request.barcode() != null && !request.barcode().isBlank()) {
            productRepository.findByBarcode(request.barcode()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) throw ApiException.conflict("الباركود مستخدم مسبقاً لمنتج آخر");
            });
        }

        Unit unit = unitRepository.findById(request.unitId())
                .orElseThrow(() -> ApiException.notFound("وحدة القياس غير موجودة"));
        Category category = request.categoryId() != null
                ? categoryRepository.findById(request.categoryId()).orElseThrow(() -> ApiException.notFound("التصنيف غير موجود"))
                : null;

        product.setSku(request.sku());
        product.setBarcode(blankToNull(request.barcode()));
        product.setName(request.name());
        product.setNameEn(request.nameEn());
        product.setCategory(category);
        product.setUnit(unit);
        product.setUnitsPerCarton(request.unitsPerCarton());
        product.setPurchasePrice(request.purchasePrice());
        product.setSalePrice(request.salePrice());
        product.setTaxRate(request.taxRate() != null ? request.taxRate() : BigDecimal.ZERO);
        product.setMinStockThreshold(request.minStockThreshold() != null ? request.minStockThreshold() : BigDecimal.ZERO);
        product.setImageUrl(request.imageUrl());
        if (request.active() != null) product.setActive(request.active());
        product.setUpdatedAt(LocalDateTime.now());

        return toDto(productRepository.save(product));
    }

    @Transactional
    public void delete(Long id) {
        Product product = getOrThrow(id);
        product.setActive(false); // حذف منطقي حفاظاً على تاريخ الفواتير والحركات
        productRepository.save(product);
    }

    private Product getOrThrow(Long id) {
        return productRepository.findById(id).orElseThrow(() -> ApiException.notFound("المنتج غير موجود"));
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private ProductDto toDto(Product p) {
        BigDecimal totalStock = stockItemRepository.findByProductId(p.getId()).stream()
                .map(si -> si.getQuantity())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return toDto(p, totalStock);
    }

    private ProductDto toDto(Product p, BigDecimal totalStock) {

        return new ProductDto(
                p.getId(), p.getSku(), p.getBarcode(), p.getName(), p.getNameEn(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getUnit().getId(), p.getUnit().getName(),
                p.getUnitsPerCarton(),
                p.getPurchasePrice(), p.getSalePrice(), p.getTaxRate(), p.getMinStockThreshold(),
                p.getImageUrl(), p.isActive(), totalStock
        );
    }
}
