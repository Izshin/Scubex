package com.scubex.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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
class PublicationControllerTest {

    @Mock private PublicationService publicationService;
    @Mock private UserService userService;
    @Mock private InteractionService interactionService;
    @Mock private AuthHelper authHelper;

    @InjectMocks
    private PublicationController publicationController;

    private MockMvc mockMvc;
    private final ObjectMapper mapper = new ObjectMapper();

    private final UsernamePasswordAuthenticationToken principal =
            new UsernamePasswordAuthenticationToken("gid-1", null, List.of());

    private User buildUser() {
        return User.builder().id(1L).googleId("gid-1").email("u@test.com").name("Ana").build();
    }

    private Publication buildPublication(User user) {
        return Publication.builder()
                .id(1L).user(user).title("Buceo en Nerja")
                .description("Genial").imageUrl("https://img")
                .latitude(36.7).longitude(-3.7)
                .createdAt(Instant.now())
                .build();
    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(publicationController).build();
    }

    // ── GET /api/publications ─────────────────────────────────────────

    @Test
    void getAll_returns200WithList() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(publicationService.getAll()).thenReturn(List.of(pub));
        when(interactionService.getLikeCount(1L)).thenReturn(5L);
        when(interactionService.getCommentCount(1L)).thenReturn(2L);

        mockMvc.perform(get("/api/publications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Buceo en Nerja"))
                .andExpect(jsonPath("$[0].likeCount").value(5));
    }

    // ── GET /api/publications/area ────────────────────────────────────

    @Test
    void getInArea_returns200WithList() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(publicationService.getInArea(35.0, 38.0, -5.0, -2.0)).thenReturn(List.of(pub));
        when(interactionService.getLikeCount(1L)).thenReturn(0L);
        when(interactionService.getCommentCount(1L)).thenReturn(0L);

        mockMvc.perform(get("/api/publications/area")
                        .param("latMin", "35.0").param("latMax", "38.0")
                        .param("lngMin", "-5.0").param("lngMax", "-2.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    // ── GET /api/publications/{id} ────────────────────────────────────

    @Test
    void getById_found_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(publicationService.getById(1L)).thenReturn(pub);
        when(interactionService.getLikeCount(1L)).thenReturn(0L);
        when(interactionService.getCommentCount(1L)).thenReturn(0L);

        mockMvc.perform(get("/api/publications/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Buceo en Nerja"));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(publicationService.getById(99L)).thenReturn(null);

        mockMvc.perform(get("/api/publications/99"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/publications ────────────────────────────────────────

    @Test
    void create_authenticated_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.create(any())).thenReturn(pub);
        when(interactionService.getLikeCount(1L)).thenReturn(0L);
        when(interactionService.getCommentCount(1L)).thenReturn(0L);

        mockMvc.perform(post("/api/publications")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "title", "Buceo en Nerja",
                                "description", "Genial",
                                "imageUrl", "https://img",
                                "latitude", 36.7,
                                "longitude", -3.7))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Buceo en Nerja"));
    }

    // ── GET /api/publications/mine ────────────────────────────────────

    @Test
    void getMine_authenticated_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.getByUser(user)).thenReturn(List.of(pub));
        when(interactionService.getLikeCount(1L)).thenReturn(0L);
        when(interactionService.getCommentCount(1L)).thenReturn(0L);

        mockMvc.perform(get("/api/publications/mine").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    // ── DELETE /api/publications/{id} ─────────────────────────────────

    @Test
    void delete_authorized_returns200() throws Exception {
        User user = buildUser();
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.delete(1L, user)).thenReturn(true);

        mockMvc.perform(delete("/api/publications/1").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void delete_notAuthorized_returns403() throws Exception {
        User user = buildUser();
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.delete(1L, user)).thenReturn(false);

        mockMvc.perform(delete("/api/publications/1").principal(principal))
                .andExpect(status().isForbidden());
    }

    // ── PUT /api/publications/{id} ────────────────────────────────────

    @Test
    void update_authorized_returns200() throws Exception {
        User user = buildUser();
        Publication pub = buildPublication(user);
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.update(eq(1L), any(), eq(user))).thenReturn(pub);
        when(interactionService.getLikeCount(1L)).thenReturn(0L);
        when(interactionService.getCommentCount(1L)).thenReturn(0L);

        mockMvc.perform(put("/api/publications/1")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "title", "Nuevo título",
                                "description", "Desc",
                                "imageUrl", ""))))
                .andExpect(status().isOk());
    }

    @Test
    void update_notAuthorized_returns403() throws Exception {
        User user = buildUser();
        when(authHelper.getUser(any())).thenReturn(user);
        when(publicationService.update(eq(1L), any(), eq(user))).thenReturn(null);

        mockMvc.perform(put("/api/publications/1")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "title", "X", "description", "", "imageUrl", ""))))
                .andExpect(status().isForbidden());
    }

    @Test
    void create_unauthenticated_returns401() throws Exception {
        when(authHelper.getUser(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/api/publications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(
                                "title", "T", "latitude", 1.0, "longitude", 1.0))))
                .andExpect(status().isUnauthorized());
    }
}
