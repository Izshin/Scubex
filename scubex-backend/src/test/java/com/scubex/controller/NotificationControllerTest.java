package com.scubex.controller;

import com.scubex.model.Notification;
import com.scubex.model.User;
import com.scubex.service.NotificationService;
import com.scubex.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock private NotificationService notificationService;
    @Mock private UserService userService;
    @Mock private AuthHelper authHelper;

    @InjectMocks
    private NotificationController notificationController;

    private MockMvc mockMvc;

    private final UsernamePasswordAuthenticationToken principal =
            new UsernamePasswordAuthenticationToken("gid-1", null, List.of());

    private User buildUser() {
        return User.builder().id(1L).googleId("gid-1").email("u@test.com").name("Ana").build();
    }

    private Notification buildNotification() {
        return Notification.builder()
                .id(10L)
                .recipient(buildUser())
                .type(Notification.Type.LIKE)
                .actorName("Carlos")
                .actorEmail("carlos@test.com")
                .actorPicture("https://pic")
                .publicationId(5L)
                .publicationTitle("Mi inmersión")
                .commentSnippet("")
                .createdAt(Instant.now())
                .build();
    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(notificationController).build();
    }

    @Test
    void getNotifications_authenticated_returns200WithList() throws Exception {
        when(authHelper.getUser(any())).thenReturn(buildUser());
        when(notificationService.getNotifications(any())).thenReturn(List.of(buildNotification()));

        mockMvc.perform(get("/api/notifications").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("LIKE"))
                .andExpect(jsonPath("$[0].actorName").value("Carlos"))
                .andExpect(jsonPath("$[0].publicationId").value(5));
    }

    @Test
    void getUnreadCount_authenticated_returnsCount() throws Exception {
        when(authHelper.getUser(any())).thenReturn(buildUser());
        when(notificationService.getUnreadCount(any())).thenReturn(3L);

        mockMvc.perform(get("/api/notifications/unread-count").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3));
    }

    @Test
    void markRead_authenticated_returns200() throws Exception {
        when(authHelper.getUser(any())).thenReturn(buildUser());

        mockMvc.perform(post("/api/notifications/10/read").principal(principal))
                .andExpect(status().isOk());

        verify(notificationService, times(1)).markRead(eq(10L), any());
    }

    @Test
    void markAllRead_authenticated_returns200() throws Exception {
        when(authHelper.getUser(any())).thenReturn(buildUser());

        mockMvc.perform(post("/api/notifications/read-all").principal(principal))
                .andExpect(status().isOk());

        verify(notificationService, times(1)).markAllRead(any());
    }

    @Test
    void deleteNotification_authenticated_returns200() throws Exception {
        when(authHelper.getUser(any())).thenReturn(buildUser());

        mockMvc.perform(delete("/api/notifications/10").principal(principal))
                .andExpect(status().isOk());

        verify(notificationService, times(1)).deleteNotification(eq(10L), any());
    }

    @Test
    void getNotifications_unauthenticated_returns401() throws Exception {
        when(authHelper.getUser(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }
}
