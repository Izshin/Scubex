package com.scubex.controller;

import com.scubex.model.User;
import com.scubex.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Centralises the repeated auth-check pattern found in every controller:
 * {@code if (auth == null) return 401; user = findByGoogleId(...); if (user == null) return 404; }
 *
 * <p>Throws {@link ResponseStatusException}, which Spring MVC converts automatically
 * to the appropriate HTTP response, so controllers can simply call
 * {@code User user = authHelper.getUser(auth);} without if-chains.
 */
@Component
public class AuthHelper {

    private final UserService userService;

    public AuthHelper(UserService userService) {
        this.userService = userService;
    }

    /**
     * Resolves the authenticated user or throws a {@link ResponseStatusException}.
     *
     * @throws ResponseStatusException 401 if {@code auth} is null
     * @throws ResponseStatusException 404 if no user exists for the google-id
     */
    public User getUser(Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        User user = userService.findByGoogleId(auth.getName());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        return user;
    }
}
