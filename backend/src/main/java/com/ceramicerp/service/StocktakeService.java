package com.ceramicerp.service;

import com.ceramicerp.dto.StocktakeCountUpdateRequest;
import com.ceramicerp.dto.StocktakeCreateRequest;
import com.ceramicerp.dto.StocktakeLineDto;
import com.ceramicerp.dto.StocktakeSessionDto;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.MovementType;
import com.ceramicerp.model.StockItem;
import com.ceramicerp.model.StocktakeLine;
import com.ceramicerp.model.StocktakeSession;
import com.ceramicerp.model.StocktakeStatus;
import com.ceramicerp.model.User;
import com.ceramicerp.model.Warehouse;
import com.ceramicerp.repository.StockItemRepository;
import com.ceramicerp.repository.StocktakeLineRepository;
import com.ceramicerp.repository.StocktakeSessionRepository;
import com.ceramicerp.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StocktakeService {

    private final StocktakeSessionRepository sessionRepository;
    private final StocktakeLineRepository lineRepository;
    private final StockItemRepository stockItemRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockService stockService;
    private final FiscalYearClosingService fiscalYearClosingService;

    @Transactional(readOnly = true)
    public List<StocktakeSessionDto> findAll() {
        return sessionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(s -> toDto(s, null)).toList();
    }

    @Transactional(readOnly = true)
    public StocktakeSessionDto findById(Long id) {
        StocktakeSession session = getOrThrow(id);
        List<StocktakeLine> lines = lineRepository.findBySessionIdOrderByIdAsc(id);
        return toDto(session, lines);
    }

    /** ينشئ جلسة جرد ويأخذ لقطة فورية من الكميات النظرية الحالية لكل منتج له رصيد بهذا المخزن. */
    @Transactional
    public StocktakeSessionDto create(StocktakeCreateRequest request, User actingUser) {
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));

        StocktakeSession session = StocktakeSession.builder()
                .warehouse(warehouse).sessionDate(LocalDate.now()).status(StocktakeStatus.DRAFT)
                .notes(request.notes()).createdBy(actingUser).build();
        session = sessionRepository.save(session);

        List<StockItem> items = stockItemRepository.findByWarehouseId(request.warehouseId());
        for (StockItem item : items) {
            lineRepository.save(StocktakeLine.builder()
                    .session(session).product(item.getProduct()).systemQuantity(item.getQuantity())
                    .build());
        }
        return findById(session.getId());
    }

    /** يحدّث الكميات المعدودة فعلياً - الجلسة لازم تكون لسا مسودة (لم تُنهَ). */
    @Transactional
    public StocktakeSessionDto updateCounts(Long sessionId, StocktakeCountUpdateRequest request) {
        StocktakeSession session = getOrThrow(sessionId);
        if (session.getStatus() != StocktakeStatus.DRAFT) {
            throw ApiException.badRequest("لا يمكن تعديل جلسة جرد مُنهاة");
        }
        Map<Long, StocktakeLine> byProduct = lineRepository.findBySessionIdOrderByIdAsc(sessionId).stream()
                .collect(Collectors.toMap(l -> l.getProduct().getId(), l -> l));
        for (StocktakeCountUpdateRequest.LineCount lc : request.lines()) {
            StocktakeLine line = byProduct.get(lc.productId());
            if (line == null) continue;
            line.setCountedQuantity(lc.countedQuantity());
            lineRepository.save(line);
        }
        return findById(sessionId);
    }

    /**
     * ينهي الجرد: لكل سطر له كمية معدودة تختلف عن النظرية، يطبّق الفرق فعلياً على المخزون عبر
     * StockService.applyMovement (نفس آلية تعديل المخزون اليدوي الموجودة)، ثم يقفل الجلسة نهائياً.
     */
    @Transactional
    public StocktakeSessionDto complete(Long sessionId, User actingUser) {
        StocktakeSession session = getOrThrow(sessionId);
        if (session.getStatus() != StocktakeStatus.DRAFT) {
            throw ApiException.badRequest("الجلسة مُنهاة مسبقاً");
        }
        fiscalYearClosingService.latestClosingDate()
                .filter(closed -> !session.getSessionDate().isAfter(closed))
                .ifPresent(closed -> {
                    throw ApiException.badRequest("لا يمكن إنهاء جرد بتاريخ ضمن فترة مالية مقفلة (حتى " + closed + ")");
                });
        List<StocktakeLine> lines = lineRepository.findBySessionIdOrderByIdAsc(sessionId);
        for (StocktakeLine line : lines) {
            if (line.getCountedQuantity() == null) continue;
            BigDecimal variance = line.getCountedQuantity().subtract(line.getSystemQuantity());
            if (variance.signum() == 0) continue;
            MovementType type = variance.signum() > 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;
            stockService.applyMovement(line.getProduct(), session.getWarehouse(), variance, type,
                    "STOCKTAKE", session.getId(),
                    "فرق جرد فعلي بتاريخ " + session.getSessionDate(), actingUser);
        }
        session.setStatus(StocktakeStatus.COMPLETED);
        session.setCompletedAt(java.time.LocalDateTime.now());
        sessionRepository.save(session);
        return findById(sessionId);
    }

    private StocktakeSession getOrThrow(Long id) {
        return sessionRepository.findById(id).orElseThrow(() -> ApiException.notFound("جلسة الجرد غير موجودة"));
    }

    private StocktakeSessionDto toDto(StocktakeSession s, List<StocktakeLine> lines) {
        List<StocktakeLineDto> lineDtos = lines == null ? null : lines.stream().map(this::toLineDto).toList();
        return new StocktakeSessionDto(
                s.getId(), s.getWarehouse().getId(), s.getWarehouse().getName(), s.getSessionDate(), s.getStatus(),
                s.getNotes(), s.getCreatedBy() != null ? s.getCreatedBy().getFullName() : null,
                s.getCreatedAt(), s.getCompletedAt(), lineDtos
        );
    }

    private StocktakeLineDto toLineDto(StocktakeLine l) {
        BigDecimal variance = l.getCountedQuantity() != null
                ? l.getCountedQuantity().subtract(l.getSystemQuantity()) : null;
        return new StocktakeLineDto(l.getId(), l.getProduct().getId(), l.getProduct().getName(),
                l.getProduct().getSku(), l.getSystemQuantity(), l.getCountedQuantity(), variance);
    }
}
