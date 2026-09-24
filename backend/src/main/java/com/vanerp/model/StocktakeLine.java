package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stocktake_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private StocktakeSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** الكمية النظرية بالنظام وقت بدء الجرد (لقطة ثابتة، لا تتغير حتى لو تحركت الكمية الفعلية بعدها). */
    @Column(name = "system_quantity", nullable = false, precision = 14, scale = 3)
    private BigDecimal systemQuantity;

    /** الكمية المعدودة فعلياً - تبقى NULL لحد ما يدخلها المستخدم أثناء الجرد. */
    @Column(name = "counted_quantity", precision = 14, scale = 3)
    private BigDecimal countedQuantity;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
