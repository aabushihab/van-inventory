package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "van_shortage_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VanShortageItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shortage_id", nullable = false)
    private VanShortage shortage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 14, scale = 3)
    private BigDecimal unitPrice;

    @Column(name = "line_value", nullable = false, precision = 14, scale = 3)
    private BigDecimal lineValue;
}
