package com.ceramicerp.repository;

import com.ceramicerp.model.StocktakeLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StocktakeLineRepository extends JpaRepository<StocktakeLine, Long> {

    List<StocktakeLine> findBySessionIdOrderByIdAsc(Long sessionId);
}
