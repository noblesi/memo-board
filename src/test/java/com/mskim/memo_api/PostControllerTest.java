package com.mskim.memo_api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class PostControllerTest {

    @Autowired MockMvc mvc;
    @Autowired PostRepository repo;
    @Autowired UserRepository userRepository;

    private User user01;
    private User user02;
    private Post ownerPost;

    @BeforeEach
    void setUp() {
        repo.deleteAll();
        userRepository.deleteAll();

        user01 = userRepository.save(new User("user01", "pw", UserRole.USER));
        user02 = userRepository.save(new User("user02", "pw", UserRole.USER));
        userRepository.save(new User("admin", "pw", UserRole.ADMIN));

        ownerPost = repo.save(new Post("Hello", "world", user01));
        repo.save(new Post("Spring Boot", "nice", user02));
        repo.save(new Post("Other", "something else", user01));
    }

    @Test
    void list_default_is_paged_and_sorted_desc() throws Exception {
        mvc.perform(get("/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.items[0].title", not(emptyOrNullString())))
                .andExpect(jsonPath("$.items[0].id", notNullValue()))
                .andExpect(jsonPath("$.items[0].authorLoginId", not(emptyOrNullString())))
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
    void create_requires_authentication() throws Exception {
        mvc.perform(post("/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"content\":\"\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("unauthorized")));
    }

    @Test
    @WithMockUser(username = "user01", roles = "USER")
    void create_validation_error_returns_fieldErrors() throws Exception {
        mvc.perform(post("/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"content\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("title: ")))
                .andExpect(jsonPath("$.fieldErrors", not(empty())))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItems("title", "content")))
                .andExpect(jsonPath("$.fieldErrors[*].message", hasItems(not(emptyOrNullString()))));
    }

    @Test
    @WithMockUser(username = "user01", roles = "USER")
    void create_assigns_authenticated_user_as_author() throws Exception {
        mvc.perform(post("/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Created\",\"content\":\"content\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern("/posts/\\d+")))
                .andExpect(jsonPath("$.authorLoginId", is("user01")));
    }

    @Test
    @WithMockUser(username = "user01", roles = "USER")
    void owner_can_update_post() throws Exception {
        mvc.perform(put("/posts/{id}", ownerPost.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Updated\",\"content\":\"content\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated")))
                .andExpect(jsonPath("$.authorLoginId", is("user01")));
    }

    @Test
    @WithMockUser(username = "user02", roles = "USER")
    void non_owner_cannot_update_post() throws Exception {
        mvc.perform(put("/posts/{id}", ownerPost.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Updated\",\"content\":\"content\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", is("forbidden")));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void admin_can_update_any_post() throws Exception {
        mvc.perform(put("/posts/{id}", ownerPost.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Admin Updated\",\"content\":\"content\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Admin Updated")))
                .andExpect(jsonPath("$.authorLoginId", is("user01")));
    }

    @Test
    @WithMockUser(username = "user02", roles = "USER")
    void non_owner_cannot_delete_post() throws Exception {
        mvc.perform(delete("/posts/{id}", ownerPost.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", is("forbidden")));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void admin_can_delete_any_post() throws Exception {
        mvc.perform(delete("/posts/{id}", ownerPost.getId()))
                .andExpect(status().isNoContent());
    }
}
