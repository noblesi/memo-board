package com.mskim.memo_api.common;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageRes<T>(
        List<T> items,
        PageMeta page
) {
    public static <T> PageRes<T> from(Page<T> p) {
        return new PageRes<>(
                p.getContent(),
                new PageMeta(p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages())
        );
    }

    public record PageMeta(int number, int size, long totalElements, int totalPages) {}
}