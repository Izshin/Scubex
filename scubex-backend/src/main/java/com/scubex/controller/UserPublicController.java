package com.scubex.controller;

import com.scubex.model.Publication;
import com.scubex.model.PublicationSave;
import com.scubex.model.User;
import com.scubex.model.UserFollow;
import com.scubex.service.FollowService;
import com.scubex.service.InteractionService;
import com.scubex.service.PublicationService;
import com.scubex.service.UserService;
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
    private final PublicationService publicationService;
    private final FollowService followService;
    private final InteractionService interactionService;

    public UserPublicController(UserService userService, PublicationService publicationService,
                                FollowService followService, InteractionService interactionService) {
        this.userService = userService;
        this.publicationService = publicationService;
        this.followService = followService;
        this.interactionService = interactionService;
    }

    // ── Public profile ──

    @GetMapping("/{email}")
    public ResponseEntity<?> getPublicProfile(@PathVariable String email, Authentication auth) {
        User user = userService.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }

        List<Publication> publications = publicationService.getByUser(user);
        long followerCount = followService.getFollowerCount(user.getId());
        long followingCount = followService.getFollowingCount(user.getId());

        boolean isFollowing = false;
        if (auth != null) {
            User me = userService.findByGoogleId(auth.getName());
            if (me != null) {
                isFollowing = followService.isFollowing(me.getId(), user.getId());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("name", user.getDisplayName() != null ? user.getDisplayName() : "");
        result.put("email", user.getEmail());
        result.put("picture", user.getDisplayPicture() != null ? user.getDisplayPicture() : "");
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
        if (auth == null) return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        User me = userService.findByGoogleId(auth.getName());
        if (me == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
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
        if (auth == null) return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        User me = userService.findByGoogleId(auth.getName());
        if (me == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        List<PublicationSave> saves = interactionService.getSavedByUser(me.getId());
        return ResponseEntity.ok(saves.stream().map(s -> pubToDto(s.getPublication())).toList());
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
        dto.put("likeCount", interactionService.getLikeCount(p.getId()));
        dto.put("commentCount", interactionService.getCommentCount(p.getId()));
        dto.put("author", Map.of(
                "email", p.getUser().getEmail() != null ? p.getUser().getEmail() : "",
                "name", p.getUser().getDisplayName() != null ? p.getUser().getDisplayName() : "",
                "picture", p.getUser().getDisplayPicture() != null ? p.getUser().getDisplayPicture() : ""
        ));
        return dto;
    }
}
