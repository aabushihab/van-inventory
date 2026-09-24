package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** طلب تحميل يرسله السائق (مثلاً حمولة الغد)، ويوافق عليه المدير فيتحوّل لسند تحميل، أو يرفضه. */
@Entity
@Table(name = "van_load_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VanLoadRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "van_id", nullable = false)
    private Van van;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by")
    private User requestedBy;

    @Column(name = "for_date", nullable = false)
    private LocalDate forDate;

    /** PENDING | APPROVED | REJECTED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(length = 500)
    private String notes;

    @Column(name = "response_note", length = 500)
    private String responseNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "van_load_id")
    private VanLoad vanLoad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VanLoadRequestItem> items = new ArrayList<>();
}
