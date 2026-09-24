package com.vanerp.service;

import com.vanerp.dto.*;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.NotificationRepository;
import com.vanerp.repository.ProductRepository;
import com.vanerp.repository.VanLoadRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/** طلبات التحميل: السائق يطلب، المدير يوافق (يُنشأ سند تحميل فعلي) أو يرفض. */
@Service
@RequiredArgsConstructor
public class VanLoadRequestService {

    private final VanLoadRequestRepository requestRepository;
    private final ProductRepository productRepository;
    private final NotificationRepository notificationRepository;
    private final VanService vanService;
    private final VanAccessService vanAccessService;
    private final VanLoadService vanLoadService;

    @Transactional
    public LoadRequestDto create(LoadRequestCreateRequest request, User user) {
        Van van = vanAccessService.findVanOf(user).orElse(null);
        if (request.vanId() != null && !vanAccessService.isRestrictedSalesman(user)) {
            van = vanService.getOrThrow(request.vanId());
        }
        if (van == null) throw ApiException.badRequest("أنت غير مربوط بسيارة توزيع");
        if (!van.isActive()) throw ApiException.badRequest("السيارة غير فعّالة");

        VanLoadRequest r = VanLoadRequest.builder()
                .van(van).requestedBy(user)
                .forDate(request.forDate() != null ? request.forDate() : LocalDate.now().plusDays(1))
                .notes(request.notes()).build();
        for (VanLoadItemRequest it : request.items()) {
            Product p = productRepository.findById(it.productId()).orElseThrow(() -> ApiException.notFound("المنتج غير موجود"));
            r.getItems().add(VanLoadRequestItem.builder().request(r).product(p).quantity(it.quantity()).build());
        }
        r = requestRepository.save(r);

        notificationRepository.save(Notification.builder()
                .type(NotificationType.VAN_LOAD_REQUEST)
                .title("طلب تحميل جديد: " + van.getName())
                .message(String.format("%s طلب تحميل السيارة \"%s\" ليوم %s (%d صنف) - بانتظار موافقتك من شاشة سيارات التوزيع.",
                        user.getFullName(), van.getName(), r.getForDate(), r.getItems().size()))
                .relatedWarehouse(van.getWarehouse()).alertKey("VAN_LOAD_REQUEST:" + r.getId()).read(false).build());
        return toDto(r);
    }

    /** طلبات السائق الحالي (سيارته). */
    @Transactional(readOnly = true)
    public List<LoadRequestDto> mine(User user) {
        return vanAccessService.findVanOf(user)
                .map(v -> requestRepository.findByVanIdOrderByCreatedAtDesc(v.getId()).stream().map(this::toDto).toList())
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public List<LoadRequestDto> list(String status) {
        List<VanLoadRequest> rows = status != null && !status.isBlank()
                ? requestRepository.findByStatusOrderByCreatedAtDesc(status)
                : requestRepository.findAllByOrderByCreatedAtDesc();
        return rows.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public long pendingCount() {
        return requestRepository.countByStatus("PENDING");
    }

    /** الأصناف الفعّالة التي يمكن طلبها (للسائق). */
    @Transactional(readOnly = true)
    public List<RequestableProductDto> requestableProducts() {
        return productRepository.findAll().stream().filter(Product::isActive)
                .sorted(Comparator.comparing(Product::getName))
                .map(p -> new RequestableProductDto(p.getId(), p.getName(), p.getSku(), p.getUnit().getName(), p.getUnitsPerCarton()))
                .toList();
    }

    @Transactional
    public LoadRequestDto approve(Long id, LoadRequestDecisionRequest decision, User user) {
        VanLoadRequest r = pendingOrThrow(id);
        if (decision.warehouseId() == null) throw ApiException.badRequest("اختر المخزن الذي سيُحمَّل منه");
        List<VanLoadItemRequest> items = decision.items() != null && !decision.items().isEmpty()
                ? decision.items()
                : r.getItems().stream().map(it -> new VanLoadItemRequest(it.getProduct().getId(), it.getQuantity())).toList();
        VanLoadDto load = vanLoadService.create(new VanLoadCreateRequest(r.getVan().getId(), decision.warehouseId(), "LOAD",
                "حسب طلب التحميل رقم " + r.getId() + (decision.note() != null && !decision.note().isBlank() ? " - " + decision.note() : ""),
                items), user);
        r.setStatus("APPROVED");
        r.setVanLoad(vanLoadService.getRef(load.id()));
        r.setResponseNote(decision.note());
        r.setDecidedBy(user);
        r.setDecidedAt(LocalDateTime.now());
        return toDto(requestRepository.save(r));
    }

    @Transactional
    public LoadRequestDto reject(Long id, LoadRequestDecisionRequest decision, User user) {
        VanLoadRequest r = pendingOrThrow(id);
        if (decision.note() == null || decision.note().isBlank()) throw ApiException.badRequest("اكتب سبب الرفض");
        r.setStatus("REJECTED");
        r.setResponseNote(decision.note());
        r.setDecidedBy(user);
        r.setDecidedAt(LocalDateTime.now());
        return toDto(requestRepository.save(r));
    }

    private VanLoadRequest pendingOrThrow(Long id) {
        VanLoadRequest r = requestRepository.findById(id).orElseThrow(() -> ApiException.notFound("طلب التحميل غير موجود"));
        if (!"PENDING".equals(r.getStatus())) throw ApiException.badRequest("تم البت في هذا الطلب مسبقاً");
        return r;
    }

    private LoadRequestDto toDto(VanLoadRequest r) {
        List<VanLoadItemDto> items = r.getItems().stream().map(it -> new VanLoadItemDto(it.getId(), it.getProduct().getId(),
                it.getProduct().getName(), it.getProduct().getSku(), it.getProduct().getUnit().getName(), it.getQuantity())).toList();
        return new LoadRequestDto(r.getId(), r.getVan().getId(), r.getVan().getName(), r.getVan().getPlateNumber(),
                r.getRequestedBy() != null ? r.getRequestedBy().getFullName() : null, r.getForDate(), r.getStatus(),
                r.getNotes(), r.getResponseNote(),
                r.getVanLoad() != null ? r.getVanLoad().getId() : null,
                r.getVanLoad() != null ? r.getVanLoad().getLoadNumber() : null,
                r.getDecidedBy() != null ? r.getDecidedBy().getFullName() : null, r.getDecidedAt(), r.getCreatedAt(), items);
    }
}
