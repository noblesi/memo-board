package com.mskim.memo_api;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "posts")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 5000)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Post() {}

    public Post(String title, String content, User author) {
        this.title = title;
        this.content = content;
        this.author = Objects.requireNonNull(author, "author must not be null");
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }

    public String getTitle() { return title; }

    public String getContent() { return content; }

    public User getAuthor() { return author; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void assignAuthor(User author) {
        this.author = Objects.requireNonNull(author, "author must not be null");
    }
}
