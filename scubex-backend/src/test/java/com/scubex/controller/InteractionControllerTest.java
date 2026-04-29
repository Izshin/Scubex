package com.scubex.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scubex.model.Comment;
import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.service.InteractionService;
import com.scubex.service.PublicationService;
import com.scubex.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class InteractionControllerTest {

    @Mock private InteractionService interactionService;
    @Mock private PublicationService publicationService;
    @Mock private UserService userService;
    @Mock private AuthHelper authHelper;

    @InjectMocks
    private InteractionController interactionController;

    private MockMvc mockMvc;
    private final ObjectMapper mapper = new ObjectMapper();

    private final UsernamePasswordAuthenticationToken principal =
            new UsernamePasswordAuthenticationToken("gid-1", null, List.of());

    private User buildUser() {
        return User.builder().id(1L).googleId("gid-1").email("u@test.com").name("Ana").build();
    }

    private Publication buildPublication(User user) {
        return Publication.builder()
                .id(5L).user(user).title("Inmersión").description("")
                .latitude(36.7).longitude(-3.7).createdAt(Instant.now()).build();
    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(interactionController).build();
    }

    // ── Likes ──────────────────────────────────────────────────────────

    @Test
    void toggleLike_pubFound_liked_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.getById(5L)).thenReturn(pub);
        when(interactionService.toggleLike(pub, user)).thenReturn(true);
        when(interactionService.getLikeCount(5L)).thenReturn(1L);

        mockMvc.perform(post("/api/publications/5/like").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void toggleLike_pubNotFound_returns404() throws Exception {
        when(authHelper.getUser(any())).thenReturn(buildUser());
        when(publicationService.getById(99L)).thenReturn(null);

        mockMvc.perform(post("/api/publications/99/like").principal(principal))
                .andExpect(status().isNotFound());
    }

    @Test
    void getLikeStatus_authenticated_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(publicationService.getById(5L)).thenReturn(pub);
        when(interactionService.getLikeCount(5L)).thenReturn(3L);
        when(userService.findByGoogleId("gid-1")).thenReturn(user);
        when(interactionService.hasUserLiked(5L, 1L)).thenReturn(true);

        mockMvc.perform(get("/api/publications/5/like").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.count").value(3));
    }

    @Test
    void getLikeStatus_unauthenticated_returns200WithLikedFalse() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(publicationService.getById(5L)).thenReturn(pub);
        when(interactionService.getLikeCount(5L)).thenReturn(2L);

        mockMvc.perform(get("/api/publications/5/like"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(false))
                .andExpect(jsonPath("$.count").value(2));
    }

    // ── Saves ──────────────────────────────────────────────────────────

    @Test
    void toggleSave_pubFound_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.getById(5L)).thenReturn(pub);
        when(interactionService.toggleSave(pub, user)).thenReturn(true);

        mockMvc.perform(post("/api/publications/5/save").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(true));
    }

    @Test
    void getSaveStatus_unauthenticated_returns200WithSavedFalse() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(publicationService.getById(5L)).thenReturn(pub);

        mockMvc.perform(get("/api/publications/5/save"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(false));
    }

    // ── Comments ───────────────────────────────────────────────────────

    @Test
    void getComments_pubFound_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        Comment comment = Comment.builder()
                .id(20L).user(user).publication(pub)
                .text("Qué bonito!").createdAt(Instant.now()).build();
        when(publicationService.getById(5L)).thenReturn(pub);
        when(interactionService.getComments(5L)).thenReturn(List.of(comment));

        mockMvc.perform(get("/api/publications/5/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].text").value("Qué bonito!"))
                .andExpect(jsonPath("$[0].author.email").value("u@test.com"));
    }

    @Test
    void getComments_pubNotFound_returns404() throws Exception {
        when(publicationService.getById(99L)).thenReturn(null);

        mockMvc.perform(get("/api/publications/99/comments"))
                .andExpect(status().isNotFound());
    }

    @Test
    void addComment_valid_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        Comment comment = Comment.builder()
                .id(21L).user(user).publication(pub)
                .text("Increíble inmersión").createdAt(Instant.now()).build();
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.getById(5L)).thenReturn(pub);
        when(interactionService.addComment(pub, user, "Increíble inmersión")).thenReturn(comment);

        mockMvc.perform(post("/api/publications/5/comments")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("text", "Increíble inmersión"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Increíble inmersión"));
    }

    @Test
    void addComment_blankText_returns400() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.getById(5L)).thenReturn(pub);

        mockMvc.perform(post("/api/publications/5/comments")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("text", "   "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addComment_tooLong_returns400() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.getById(5L)).thenReturn(pub);

        String longText = "a".repeat(501);
        mockMvc.perform(post("/api/publications/5/comments")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("text", longText))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteComment_authorized_returns200() throws Exception {
        User user = buildUser();
        when(authHelper.getUser(any())).thenReturn(user);
        when(interactionService.deleteComment(20L, user)).thenReturn(true);

        mockMvc.perform(delete("/api/publications/5/comments/20").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void deleteComment_notAuthorized_returns403() throws Exception {
        User user = buildUser();
        when(authHelper.getUser(any())).thenReturn(user);
        when(interactionService.deleteComment(20L, user)).thenReturn(false);

        mockMvc.perform(delete("/api/publications/5/comments/20").principal(principal))
                .andExpect(status().isForbidden());
    }

    @Test
    void toggleLike_unauthenticated_returns401() throws Exception {
        when(authHelper.getUser(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/api/publications/5/like"))
                .andExpect(status().isUnauthorized());
    }
}
