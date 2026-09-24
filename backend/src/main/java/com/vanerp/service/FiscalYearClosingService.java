package com.vanerp.service;

import com.vanerp.dto.FiscalYearClosingDto;
import com.vanerp.dto.FiscalYearClosingRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.FiscalYearClosing;
import com.vanerp.model.User;
import com.vanerp.repository.FiscalYearClosingRepository;
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
        // إقفال اليوم أو المستقبل يوقف كل حركات اليوم (مبيعات بدفعات، تحصيل، تسليم كاش...) - يُسمح فقط بتاريخ سابق
        if (!request.closingDate().isBefore(LocalDate.now())) {
            throw ApiException.badRequest("تاريخ الإقفال يجب أن يكون قبل اليوم - إقفال اليوم يوقف كل حركات اليوم الجارية");
        }
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

    /** إلغاء آخر إقفال فقط (تصحيح إقفال بالخطأ) - يعيد فتح الفترة حتى الإقفال الذي قبله. */
    @Transactional
    public void undoLatest(Long id) {
        FiscalYearClosing latest = fiscalYearClosingRepository.findTopByOrderByClosingDateDesc()
                .orElseThrow(() -> ApiException.notFound("لا يوجد إقفال لإلغائه"));
        if (!latest.getId().equals(id)) {
            throw ApiException.badRequest("يمكن إلغاء آخر إقفال فقط");
        }
        fiscalYearClosingRepository.delete(latest);
    }

    private FiscalYearClosingDto toDto(FiscalYearClosing c) {
        return new FiscalYearClosingDto(c.getId(), c.getClosingDate(), c.getNotes(),
                c.getClosedBy() != null ? c.getClosedBy().getFullName() : null, c.getClosedAt());
    }
}
