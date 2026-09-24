package com.vanerp.repository;

import com.vanerp.model.VanCashHandover;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface VanCashHandoverRepository extends JpaRepository<VanCashHandover, Long> {
    List<VanCashHandover> findByVanIdAndCreatedAtBetweenOrderByCreatedAtDesc(Long vanId, LocalDateTime from, LocalDateTime to);
}
