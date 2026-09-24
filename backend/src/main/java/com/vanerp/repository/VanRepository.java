package com.vanerp.repository;

import com.vanerp.model.Van;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VanRepository extends JpaRepository<Van, Long> {
    Optional<Van> findByCode(String code);

    Optional<Van> findFirstBySalesmanIdAndActiveTrue(Long salesmanId);
}
