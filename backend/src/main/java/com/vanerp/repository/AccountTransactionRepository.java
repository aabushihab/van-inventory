package com.vanerp.repository;

import com.vanerp.model.AccountSourceType;
import com.vanerp.model.AccountTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AccountTransactionRepository extends JpaRepository<AccountTransaction, Long> {

    List<AccountTransaction> findByAccountIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
            Long accountId, LocalDate from, LocalDate to);

    Optional<AccountTransaction> findFirstBySourceTypeAndSourceId(AccountSourceType sourceType, Long sourceId);

    List<AccountTransaction> findByAccountId(Long accountId);

    /** كل حركات كل الحسابات ضمن فترة - لقائمة التدفقات النقدية (بعكس ledger() اللي مقيّد بحساب واحد). */
    List<AccountTransaction> findByTransactionDateBetween(LocalDate from, LocalDate to);

    /** كل الحركات قبل تاريخ معيّن - لحساب الرصيد الافتتاحي لفترة قائمة التدفقات النقدية. */
    List<AccountTransaction> findByTransactionDateBefore(LocalDate date);
}
