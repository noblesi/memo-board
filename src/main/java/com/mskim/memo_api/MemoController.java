package com.mskim.memo_api;

import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/memos")
public class MemoController {

    private final MemoRepository repo;

    public MemoController(MemoRepository repo) {
        this.repo = repo;
    }

    public record CreateReq(@NotBlank String text) {}

    @PostMapping
    public ResponseEntity<Memo> create(@RequestBody CreateReq req) {
        Memo saved = repo.save(new Memo(req.text()));
        return ResponseEntity.created(URI.create("/memos/" + saved.getId())).body(saved);
    }

    @GetMapping
    public List<Memo> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Memo> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}