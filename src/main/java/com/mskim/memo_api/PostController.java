package com.mskim.memo_api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.mskim.memo_api.common.PageRes;

import java.net.URI;
import java.time.Instant;
import java.util.Objects;

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostRepository repo;

    public PostController(PostRepository repo) {
        this.repo = repo;
    }

    public record CreateReq(
            @NotBlank @Size(max = 100) String title,
            @NotBlank @Size(max = 5000) String content
    ) {}

    public record UpdateReq(
            @NotBlank @Size(max = 100) String title,
            @NotBlank @Size(max = 5000) String content
    ) {}

    // 상세/생성/수정 응답 DTO
    public record PostRes(
            Long id,
            String title,
            String content,
            Instant createdAt,
            Instant updatedAt
    ) {
        static PostRes from(Post p) {
            return new PostRes(p.getId(), p.getTitle(), p.getContent(), p.getCreatedAt(), p.getUpdatedAt());
        }
    }

    // 목록용 요약 DTO (content 제외)
    public record PostSummaryRes(
            Long id,
            String title,
            Instant createdAt,
            Instant updatedAt
    ) {
        static PostSummaryRes from(Post p) {
            return new PostSummaryRes(p.getId(), p.getTitle(), p.getCreatedAt(), p.getUpdatedAt());
        }
    }

    @PostMapping
    public ResponseEntity<PostRes> create(@Valid @RequestBody CreateReq req) {
        Post saved = repo.save(new Post(req.title(), req.content()));

        Long id = Objects.requireNonNull(saved.getId(), "saved.id must not be null after save");
        URI location = Objects.requireNonNull(URI.create("/posts/" + id));

        return ResponseEntity.created(location).body(PostRes.from(saved));
    }

    @GetMapping
    public PageRes<PostSummaryRes> list(
            @RequestParam(defaultValue = "") String q,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Pageable p = Objects.requireNonNull(pageable, "pageable must not be null");

        Page<Post> page = q.isBlank()
                ? repo.findAll(p)
                : repo.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(q, q, p);

        return PageRes.from(page.map(PostSummaryRes::from));
    }

    @GetMapping("/{id}")
    public PostRes get(@PathVariable long id) {
        Post post = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));
        return PostRes.from(post);
    }

    @PutMapping("/{id}")
    public PostRes update(@PathVariable long id, @Valid @RequestBody UpdateReq req) {
        Post post = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));

        post.update(req.title(), req.content());
        Post saved = repo.save(Objects.requireNonNull(post, "post must not be null"));
        return PostRes.from(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found");
        }
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}