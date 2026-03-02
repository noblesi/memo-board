package com.mskim.memo_api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/memos")
@SuppressWarnings("null")
public class MemoController {

    private final MemoRepository repo;

    public MemoController(MemoRepository repo) {
        this.repo = repo;
    }

    public record CreateReq(@NotBlank String text) {}

    @PostMapping
    public ResponseEntity<Memo> create(@Valid @RequestBody CreateReq req) {
        Memo saved = repo.save(new Memo(req.text()));
        
        Long id = Objects.requireNonNull(saved.getId(), "saved.id must not be null after save");
        URI location = Objects.requireNonNull(URI.create("/memos/" + id), "location must not be null");
        return ResponseEntity.created(location).body(saved);
    }

    @GetMapping
    public List<Memo> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Memo> get(@PathVariable long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
}

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
}
}