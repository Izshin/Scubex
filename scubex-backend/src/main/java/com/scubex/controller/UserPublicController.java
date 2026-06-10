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
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserPublicController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PublicationService publicationService;
    private final FollowService followService;
    private final InteractionService interactionService;
    private final AuthHelper authHelper;

    public UserPublicController(UserService userService, UserRepository userRepository,
                                PublicationService publicationService,
                                FollowService followService, InteractionService interactionService,
                                AuthHelper authHelper) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.publicationService = publicationService;
        this.followService = followService;
        this.interactionService = interactionService;
        this.authHelper = authHelper;
    }

    // ── User search (for mention autocomplete) ──

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String q, Authentication auth) {
        authHelper.getUser(auth); // require login
        if (q == null || q.isBlank() || q.length() < 2) return ResponseEntity.ok(List.of());
        List<User> users = userRepository.searchByQuery(q.trim(), PageRequest.of(0, 8));
        return ResponseEntity.ok(users.stream().map(this::userToDto).toList());
    }

    // ── Public profile ──

    @GetMapping("/{email}")
    public ResponseEntity<?> getPublicProfile(@PathVariable String email, Authentication auth) {
        User user = userService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }

        User me = getOptionalUser(auth);
        boolean isOwn = me != null && me.getId().equals(user.getId());
        List<Publication> publications = publicationService.getByUserVisibleTo(user, me);
        long followerCount = followService.getFollowerCount(user.getId());
        long followingCount = followService.getFollowingCount(user.getId());

        boolean isFollowing = false;
        if (me != null) {
            isFollowing = followService.isFollowing(me.getId(), user.getId());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("name", user.getDisplayName() != null ? user.getDisplayName() : "");
        result.put("email", user.getEmail());
        result.put("picture", user.getDisplayPicture() != null ? user.getDisplayPicture() : "");
        result.put("accountPrivate", Boolean.TRUE.equals(user.getAccountPrivate()));
        result.put("isOwnProfile", isOwn);
        result.put("followerCount", followerCount);
        result.put("followingCount", followingCount);
        result.put("isFollowing", isFollowing);
        result.put("publicationCount", publications.size());
        result.put("publications", publications.stream().map(this::pubToDto).toList());

        return ResponseEntity.ok(result);
    }

    // ── Follow / Unfollow ──

    @PostMapping("/{email}/follow")
    public ResponseEntity<?> toggleFollow(@PathVariable String email, Authentication auth) {
        User me = authHelper.getUser(auth);
        User target = userService.findByEmail(email);
        if (target == null) return ResponseEntity.status(404).body(Map.of("error", "Target user not found"));

        if (me.getEmail().equals(target.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot follow yourself"));
        }

        boolean following = followService.toggleFollow(me, target);
        long followerCount = followService.getFollowerCount(target.getId());
        return ResponseEntity.ok(Map.of("following", following, "followerCount", followerCount));
    }

    // ── Followers / Following lists ──

    @GetMapping("/{email}/followers")
    public ResponseEntity<?> getFollowers(@PathVariable String email) {
        User user = userService.findByEmail(email);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        List<UserFollow> followers = followService.getFollowers(user.getId());
        return ResponseEntity.ok(followers.stream().map(f -> userToDto(f.getFollower())).toList());
    }

    @GetMapping("/{email}/following")
    public ResponseEntity<?> getFollowing(@PathVariable String email) {
        User user = userService.findByEmail(email);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        List<UserFollow> following = followService.getFollowing(user.getId());
        return ResponseEntity.ok(following.stream().map(f -> userToDto(f.getFollowed())).toList());
    }

    // ── Saved publications (own profile) ──

    @GetMapping("/me/saved")
    public ResponseEntity<?> getSaved(Authentication auth) {
        User me = authHelper.getUser(auth);
        List<PublicationSave> saves = interactionService.getSavedByUser(me.getId());
        return ResponseEntity.ok(saves.stream()
                .map(PublicationSave::getPublication)
                .filter(p -> publicationService.canView(p, me))
                .map(this::pubToDto)
                .toList());
    }

    private Map<String, Object> userToDto(User u) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("name", u.getDisplayName() != null ? u.getDisplayName() : "");
        dto.put("email", u.getEmail());
        dto.put("picture", u.getDisplayPicture() != null ? u.getDisplayPicture() : "");
        return dto;
    }

    private Map<String, Object> pubToDto(Publication p) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", p.getId());
        dto.put("title", p.getTitle());
        dto.put("description", p.getDescription() != null ? p.getDescription() : "");
        dto.put("imageUrl", p.getImageUrl() != null ? p.getImageUrl() : "");
        dto.put("latitude", p.getLatitude());
        dto.put("longitude", p.getLongitude());
        dto.put("createdAt", p.getCreatedAt().toString());
        dto.put("isPrivate", Boolean.TRUE.equals(p.getIsPrivate()));
        dto.put("likeCount", interactionService.getLikeCount(p.getId()));
        dto.put("commentCount", interactionService.getCommentCount(p.getId()));
        dto.put("author", Map.of(
                "email", p.getUser().getEmail() != null ? p.getUser().getEmail() : "",
                "name", p.getUser().getDisplayName() != null ? p.getUser().getDisplayName() : "",
                "picture", p.getUser().getDisplayPicture() != null ? p.getUser().getDisplayPicture() : ""
        ));
        return dto;
    }

    private User getOptionalUser(Authentication auth) {
        if (auth == null || auth.getName() == null) return null;
        return userService.findByGoogleId(auth.getName());
    }
}
