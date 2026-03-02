package com.mskim.memo_api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
class PostControllerTest {

    @Autowired MockMvc mvc;
    @Autowired PostRepository repo;

    @BeforeEach
    void setUp() {
        repo.deleteAll();
        repo.save(new Post("Hello", "world"));
        repo.save(new Post("Spring Boot", "nice"));
        repo.save(new Post("Other", "something else"));
    }

    @Test
    void list_default_is_paged_and_sorted_desc() throws Exception {
        mvc.perform(get("/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.items[0].title", not(emptyOrNullString())))
                .andExpect(jsonPath("$.items[0].id", notNullValue()))
                .andExpect(jsonPath("$.items[0].createdAt", notNullValue()))
                .andExpect(jsonPath("$.page.number", is(0)))
                .andExpect(jsonPath("$.page.size", is(20)));
    }

    @Test
    void list_search_q_filters() throws Exception {
        mvc.perform(get("/posts").param("q", "spring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].title", containsStringIgnoringCase("spring")))
                .andExpect(jsonPath("$.page.totalElements", is(1)));
    }

    @Test
    void create_validation_error_returns_fieldErrors() throws Exception {
        mvc.perform(post("/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"content\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("validation failed")))
                .andExpect(jsonPath("$.fieldErrors", not(empty())))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItems("title", "content")));
    }
}