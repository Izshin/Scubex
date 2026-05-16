package com.scubex.controller;

import com.scubex.model.User;
import com.scubex.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthHelperTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private AuthHelper authHelper;

    @Test
    void getUser_nullAuth_throws401() {
        assertThatThrownBy(() -> authHelper.getUser(null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void getUser_userNotFound_throws404() {
        var auth = new UsernamePasswordAuthenticationToken("unknown-gid", null, List.of());
        when(userService.findByGoogleId("unknown-gid")).thenReturn(null);

        assertThatThrownBy(() -> authHelper.getUser(auth))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getUser_validAuth_returnsUser() {
        var auth = new UsernamePasswordAuthenticationToken("gid-1", null, List.of());
        User user = User.builder().id(1L).googleId("gid-1").email("a@b.com").build();
        when(userService.findByGoogleId("gid-1")).thenReturn(user);

        User result = authHelper.getUser(auth);

        assertThat(result).isSameAs(user);
    }
}
