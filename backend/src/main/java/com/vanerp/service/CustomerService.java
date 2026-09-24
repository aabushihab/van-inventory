package com.vanerp.service;

import com.vanerp.dto.PartyDto;
import com.vanerp.exception.ApiException;
import com.vanerp.model.Customer;
import com.vanerp.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final SalesInvoiceService salesInvoiceService;

    @Transactional(readOnly = true)
    public List<PartyDto> findAll(String q) {
        Map<Long, BigDecimal> balances = salesInvoiceService.customerOutstandingMap();
        return customerRepository.search(q).stream().map(c -> toDto(c, balances)).toList();
    }

    @Transactional(readOnly = true)
    public Page<PartyDto> findAllPage(String q, Pageable pageable) {
        Map<Long, BigDecimal> balances = salesInvoiceService.customerOutstandingMap();
        return customerRepository.searchPage(q, pageable).map(c -> toDto(c, balances));
    }

    @Transactional
    public PartyDto create(PartyDto dto) {
        Customer c = Customer.builder().name(dto.name()).phone(dto.phone()).email(dto.email())
                .address(dto.address()).taxNumber(dto.taxNumber()).creditLimit(dto.creditLimit()).active(true)
                .idType(idType(dto.idType())).idNumber(blankToNull(dto.idNumber()))
                .postalCode(postal(dto.postalCode())).cityCode(blankToNull(dto.cityCode())).build();
        return toDto(customerRepository.save(c));
    }

    @Transactional
    public PartyDto update(Long id, PartyDto dto) {
        Customer c = customerRepository.findById(id).orElseThrow(() -> ApiException.notFound("العميل غير موجود"));
        c.setName(dto.name()); c.setPhone(dto.phone()); c.setEmail(dto.email());
        c.setAddress(dto.address()); c.setTaxNumber(dto.taxNumber()); c.setActive(dto.active());
        c.setCreditLimit(dto.creditLimit());
        c.setIdType(idType(dto.idType())); c.setIdNumber(blankToNull(dto.idNumber()));
        c.setPostalCode(postal(dto.postalCode())); c.setCityCode(blankToNull(dto.cityCode()));
        return toDto(customerRepository.save(c));
    }

    @Transactional
    public void delete(Long id) {
        customerRepository.deleteById(id);
    }

    private PartyDto toDto(Customer c) {
        return toDto(c, salesInvoiceService.customerOutstandingMap());
    }

    private PartyDto toDto(Customer c, Map<Long, BigDecimal> balances) {
        return new PartyDto(c.getId(), c.getName(), c.getPhone(), c.getEmail(), c.getAddress(), c.getTaxNumber(), c.isActive(),
                c.getCreditLimit(), balances.getOrDefault(c.getId(), BigDecimal.ZERO),
                c.getIdType(), c.getIdNumber(), c.getPostalCode(), c.getCityCode());
    }

    /** نوع هوية المشتري المقبول بنظام الفوترة الوطني فقط. */
    private static String idType(String v) {
        if (v == null || v.isBlank()) return null;
        if (!java.util.Set.of("NIN", "PN", "TN").contains(v)) {
            throw com.vanerp.exception.ApiException.badRequest("نوع الهوية غير صحيح");
        }
        return v;
    }

    /** الرمز البريدي حسب نظام الفوترة: أرقام، 5 خانات كحد أقصى. */
    private static String postal(String v) {
        String p = blankToNull(v);
        if (p != null && !p.matches("\\d{1,5}")) {
            throw com.vanerp.exception.ApiException.badRequest("الرمز البريدي يجب أن يكون أرقاماً (5 خانات كحد أقصى)");
        }
        return p;
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
