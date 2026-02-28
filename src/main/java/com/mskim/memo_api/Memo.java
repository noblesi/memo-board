package com.mskim.memo_api;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "memos")
public class Memo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String text;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Memo() {}

    public Memo(String text) {
        this.text = text;
    }

    public Long getId() {return id;}
    public String getText() {return text;}
    public Instant getCreatedAt() {return createdAt;}
}
