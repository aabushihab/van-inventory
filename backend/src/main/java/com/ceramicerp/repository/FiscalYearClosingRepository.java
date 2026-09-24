package com.ceramicerp.repository;

import com.ceramicerp.model.FiscalYearClosing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FiscalYearClosingRepository extends JpaRepository<FiscalYearClosing, Long> {

    Optional<FiscalYearClosing> findTopByOrderByClosingDateDesc();

    List<FiscalYearClosing> findAllByOrderByClosingDateDesc();
}
