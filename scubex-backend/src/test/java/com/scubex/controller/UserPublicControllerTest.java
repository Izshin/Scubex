package com.scubex.controller;

import com.scubex.model.Publication;
import com.scubex.model.PublicationSave;
import com.scubex.model.User;
import com.scubex.model.UserFollow;
import com.scubex.repository.UserRepository;
import com.scubex.service.FollowService;
import com.scubex.service.InteractionService;
import com.scubex.service.PublicationService;
import com.scubex.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UserPublicControllerTest {

    @Mock private UserService userService;
    @Mock private UserRepository userRepository;
    @Mock private PublicationService publicationService;
    @Mock private FollowService followService;
    @Mock private InteractionService interactionService;
    @Mock private AuthHelper authHelper;

    @InjectMocks
    private UserPublicController userPublicController;

    private MockMvc mockMvc;

    private final UsernamePasswordAuthenticationToken principal =
            new UsernamePasswordAuthenticationToken("gid-1", null, List.of());

    private User buildUser(Long id, String googleId, String email, String name) {
        return User.builder().id(id).googleId(googleId).email(email).name(name).build();
    }

    private Publication buildPub(User user) {
        return Publication.builder()
                .id(1L).user(user).title("Dive").description("")
                .imageUrl("").latitude(36.7).longitude(-3.7)
                .createdAt(Instant.now()).build();
    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(userPublicController).build();
    }

    // ── GET /api/users/search ─────────────────────────────────────────

    @Test
    void searchUsers_validQuery_returns200() throws Exception {
        User me = buildUser(1L, "gid-1", "me@test.com", "Me");
        User found = buildUser(2L, "gid-2", "carlos@test.com", "Carlos");
        when(authHelper.getUser(any())).thenReturn(me);
        when(userRepository.searchByQuery(eq("carlos"), any(Pageable.class))).thenReturn(List.of(found));

        mockMvc.perform(get("/api/users/search").param("q", "carlos").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("carlos@test.com"));
    }

    @Test
    void searchUsers_queryTooShort_returns200Empty() throws Exception {
        when(authHelper.getUser(any())).thenReturn(buildUser(1L, "gid-1", "me@test.com", "Me"));

        mockMvc.perform(get("/api/users/search").param("q", "a").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ── GET /api/users/{email} ────────────────────────────────────────

    @Test
    void getPublicProfile_userFound_returns200() throws Exception {
        User target = buildUser(2L, "gid-2", "carlos@test.com", "Carlos");
        User me = buildUser(1L, "gid-1", "me@test.com", "Me");
        Publication pub = buildPub(target);
        when(userService.findByEmail("carlos@test.com")).thenReturn(target);
        when(publicationService.getByUser(target)).thenReturn(List.of(pub));
        when(followService.getFollowerCount(2L)).thenReturn(10L);
        when(followService.getFollowingCount(2L)).thenReturn(5L);
        when(userService.findByGoogleId("gid-1")).thenReturn(me);
        when(followService.isFollowing(1L, 2L)).thenReturn(false);
        when(interactionService.getLikeCount(1L)).thenReturn(0L);
        when(interactionService.getCommentCount(1L)).thenReturn(0L);

        mockMvc.perform(get("/api/users/carlos@test.com").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("carlos@test.com"))
                .andExpect(jsonPath("$.followerCount").value(10))
                .andExpect(jsonPath("$.isFollowing").value(false));
    }

    @Test
    void getPublicProfile_userNotFound_returns404() throws Exception {
        when(userService.findByEmail("nobody@test.com")).thenReturn(null);

        mockMvc.perform(get("/api/users/nobody@test.com"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/users/{email}/follow ────────────────────────────────

    @Test
    void toggleFollow_valid_returns200() throws Exception {
        User me = buildUser(1L, "gid-1", "me@test.com", "Me");
        User target = buildUser(2L, "gid-2", "carlos@test.com", "Carlos");
        when(authHelper.getUser(any())).thenReturn(me);
        when(userService.findByEmail("carlos@test.com")).thenReturn(target);
        when(followService.toggleFollow(me, target)).thenReturn(true);
        when(followService.getFollowerCount(2L)).thenReturn(11L);

        mockMvc.perform(post("/api/users/carlos@test.com/follow").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.following").value(true))
                .andExpect(jsonPath("$.followerCount").value(11));
    }

    @Test
    void toggleFollow_selfFollow_returns400() throws Exception {
        User me = buildUser(1L, "gid-1", "me@test.com", "Me");
        when(authHelper.getUser(any())).thenReturn(me);
        when(userService.findByEmail("me@test.com")).thenReturn(me);

        mockMvc.perform(post("/api/users/me@test.com/follow").principal(principal))
                .andExpect(status().isBadRequest());
    }

    @Test
    void toggleFollow_targetNotFound_returns404() throws Exception {
        User me = buildUser(1L, "gid-1", "me@test.com", "Me");
        when(authHelper.getUser(any())).thenReturn(me);
        when(userService.findByEmail("ghost@test.com")).thenReturn(null);

        mockMvc.perform(post("/api/users/ghost@test.com/follow").principal(principal))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/users/{email}/followers ──────────────────────────────

    @Test
    void getFollowers_returns200() throws Exception {
        User target = buildUser(2L, "gid-2", "carlos@test.com", "Carlos");
        User follower = buildUser(1L, "gid-1", "me@test.com", "Me");
        UserFollow uf = UserFollow.builder().follower(follower).followed(target).build();
        when(userService.findByEmail("carlos@test.com")).thenReturn(target);
        when(followService.getFollowers(2L)).thenReturn(List.of(uf));

        mockMvc.perform(get("/api/users/carlos@test.com/followers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("me@test.com"));
    }

    // ── GET /api/users/me/saved ───────────────────────────────────────

    @Test
    void getSaved_authenticated_returns200() throws Exception {
        User me = buildUser(1L, "gid-1", "me@test.com", "Me");
        Publication pub = buildPub(me);
        PublicationSave save = PublicationSave.builder().user(me).publication(pub).build();
        when(authHelper.getUser(any())).thenReturn(me);
        when(interactionService.getSavedByUser(1L)).thenReturn(List.of(save));
        when(interactionService.getLikeCount(1L)).thenReturn(0L);
        when(interactionService.getCommentCount(1L)).thenReturn(0L);

        mockMvc.perform(get("/api/users/me/saved").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Dive"));
    }

    @Test
    void getSaved_unauthenticated_returns401() throws Exception {
        when(authHelper.getUser(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        mockMvc.perform(get("/api/users/me/saved"))
                .andExpect(status().isUnauthorized());
    }
}
