package com.mskim.memo_api;

import com.mskim.memo_api.common.PageRes;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.time.Instant;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/posts")
@SuppressWarnings("null")
public class PostController {

    private final PostRepository repo;
    private final UserRepository userRepository;

    public PostController(PostRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    public record CreateReq(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 5000) String content
    ) {}

    public record UpdateReq(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 5000) String content
    ) {}

    public record PostRes(
        Long id,
        String title,
        String content,
        String authorLoginId,
        Instant createdAt,
        Instant updatedAt
    ) {
        static PostRes from(Post p) {
            return new PostRes(
                p.getId(),
                p.getTitle(),
                p.getContent(),
                authorLoginIdOf(p),
                p.getCreatedAt(),
                p.getUpdatedAt()
            );
        }
    }

    public record PostSummaryRes(
        Long id,
        String title,
        String summary,
        String authorLoginId,
        Instant createdAt,
        Instant updatedAt
    ) {
        static PostSummaryRes from(Post p) {
            return new PostSummaryRes(
                p.getId(),
                p.getTitle(),
                summarize(p.getContent()),
                authorLoginIdOf(p),
                p.getCreatedAt(),
                p.getUpdatedAt()
            );
        }

        static String summarize(String content) {
            if (content == null) return "";
            String s = content
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("\\s+", " ")
                .trim();
            int limit = 120;
            if (s.length() <= limit) return s;
            return s.substring(0, limit).trim() + "…";
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
        @Valid @RequestBody CreateReq req,
        Authentication authentication
    ) {
        User currentUser = getCurrentUser(authentication);
        Post saved = repo.save(new Post(req.title(), req.content(), currentUser));
        Long id = Objects.requireNonNull(saved.getId(), "saved.id must not be null after save");
        URI location = URI.create("/posts/" + id);
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
    public PostRes update(
        @PathVariable long id,
        @Valid @RequestBody UpdateReq req,
        Authentication authentication
    ) {
        Post post = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));

        User currentUser = getCurrentUser(authentication);
        validateOwnerOrAdmin(post, currentUser);

        post.update(req.title(), req.content());
        Post saved = repo.save(post);
        return PostRes.from(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @PathVariable long id,
        Authentication authentication
    ) {
        Post post = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));

        User currentUser = getCurrentUser(authentication);
        validateOwnerOrAdmin(post, currentUser);

        repo.delete(post);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
        }

        String loginId = authentication.getName();
        return userRepository.findByLoginId(loginId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found"));
    }

    private void validateOwnerOrAdmin(Post post, User currentUser) {
        boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
        boolean isOwner = post.getAuthor() != null
            && Objects.equals(post.getAuthor().getId(), currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
    }

    private static String authorLoginIdOf(Post post) {
        User author = post.getAuthor();
        return author != null ? author.getLoginId() : null;
    }
}