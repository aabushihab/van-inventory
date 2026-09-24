package com.vanerp.repository;

import com.vanerp.model.StocktakeLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StocktakeLineRepository extends JpaRepository<StocktakeLine, Long> {

    List<StocktakeLine> findBySessionIdOrderByIdAsc(Long sessionId);
}
