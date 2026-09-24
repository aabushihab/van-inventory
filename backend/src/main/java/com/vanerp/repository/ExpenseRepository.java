package com.vanerp.repository;

import com.vanerp.model.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query("""
        SELECT e FROM Expense e
        WHERE (CAST(:q AS string) IS NULL OR LOWER(e.category) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(e.notes) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
          AND (CAST(:from AS date) IS NULL OR e.expenseDate >= CAST(:from AS date))
          AND (CAST(:to AS date) IS NULL OR e.expenseDate <= CAST(:to AS date))
        ORDER BY e.expenseDate DESC, e.id DESC
        """)
    Page<Expense> search(@Param("q") String q, @Param("from") LocalDate from, @Param("to") LocalDate to, Pageable pageable);

    List<Expense> findByExpenseDateBetween(LocalDate from, LocalDate to);

    List<Expense> findByEmployeeIdOrderByExpenseDateDesc(Long employeeId);

    @Query("""
        SELECT e.employee.id, COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.category IN :categories AND e.employee IS NOT NULL AND e.salaryPeriod BETWEEN :from AND :to
        GROUP BY e.employee.id
        """)
    List<Object[]> sumByEmployeeAndCategoriesBetweenPeriod(@Param("categories") java.util.Collection<String> categories,
                                                             @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.employee.id = :employeeId AND e.category IN :categories
          AND e.salaryPeriod BETWEEN :from AND :to
          AND e.id <> :excludeId
        """)
    java.math.BigDecimal sumAmountForEmployeeInPeriod(@Param("employeeId") Long employeeId,
                                                        @Param("categories") java.util.Collection<String> categories,
                                                        @Param("from") LocalDate from, @Param("to") LocalDate to,
                                                        @Param("excludeId") long excludeId);
}
