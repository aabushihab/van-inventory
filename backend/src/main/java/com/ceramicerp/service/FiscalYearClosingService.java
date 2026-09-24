package com.ceramicerp.service;

import com.ceramicerp.dto.FiscalYearClosingDto;
import com.ceramicerp.dto.FiscalYearClosingRequest;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.FiscalYearClosing;
import com.ceramicerp.model.User;
import com.ceramicerp.repository.FiscalYearClosingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FiscalYearClosingService {

    private final FiscalYearClosingRepository fiscalYearClosingRepository;

    @Transactional(readOnly = true)
    public List<FiscalYearClosingDto> findAll() {
        return fiscalYearClosingRepository.findAllByOrderByClosingDateDesc().stream().map(this::toDto).toList();
    }

    /** تاريخ آخر إقفال فعّال - كل حركة حساب أو إنهاء جرد بتاريخ يساوي أو يسبقه يُرفض. */
    @Transactional(readOnly = true)
    public Optional<LocalDate> latestClosingDate() {
        return fiscalYearClosingRepository.findTopByOrderByClosingDateDesc().map(FiscalYearClosing::getClosingDate);
    }

    @Transactional
    public FiscalYearClosingDto close(FiscalYearClosingRequest request, User actingUser) {
        latestClosingDate().ifPresent(existing -> {
            if (!request.closingDate().isAfter(existing)) {
                throw ApiException.badRequest("تاريخ الإقفال الجديد يجب أن يكون بعد آخر إقفال سابق (" + existing + ")");
            }
        });
        FiscalYearClosing closing = FiscalYearClosing.builder()
                .closingDate(request.closingDate()).notes(request.notes()).closedBy(actingUser)
                .build();
        return toDto(fiscalYearClosingRepository.save(closing));
    }

    private FiscalYearClosingDto toDto(FiscalYearClosing c) {
        return new FiscalYearClosingDto(c.getId(), c.getClosingDate(), c.getNotes(),
                c.getClosedBy() != null ? c.getClosedBy().getFullName() : null, c.getClosedAt());
    }
}
