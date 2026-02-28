package com.mskim.memo_api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

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

    @PostMapping
    public ResponseEntity<Post> create(@Valid @RequestBody CreateReq req) {
        Post saved = repo.save(new Post(req.title(), req.content()));
        return ResponseEntity.created(URI.create("/posts/" + saved.getId())).body(saved);
    }

    @GetMapping
    public List<Post> list() {
        return repo.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @GetMapping("/{id}")
    public Post get(@PathVariable Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));
    }

    @PutMapping("/{id}")
    public Post update(@PathVariable Long id, @Valid @RequestBody UpdateReq req) {
        Post post = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));

        post.update(req.title(), req.content());
        return repo.save(post);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Post post = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));

        repo.delete(post);
        return ResponseEntity.noContent().build();
    }
}