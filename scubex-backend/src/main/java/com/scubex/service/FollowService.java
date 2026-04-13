package com.scubex.service;

import com.scubex.model.User;
import com.scubex.model.UserFollow;
import com.scubex.repository.UserFollowRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FollowService {

    private final UserFollowRepository followRepository;

    public FollowService(UserFollowRepository followRepository) {
        this.followRepository = followRepository;
    }

    public boolean toggleFollow(User follower, User followed) {
        if (follower.getId().equals(followed.getId())) {
            return false; // can't follow yourself
        }
        Optional<UserFollow> existing = followRepository.findByFollowerIdAndFollowedId(follower.getId(), followed.getId());
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            return false; // unfollowed
        }
        followRepository.save(UserFollow.builder()
                .follower(follower)
                .followed(followed)
                .build());
        return true; // followed
    }

    public boolean isFollowing(Long followerId, Long followedId) {
        return followRepository.existsByFollowerIdAndFollowedId(followerId, followedId);
    }

    public long getFollowerCount(Long userId) {
        return followRepository.countByFollowedId(userId);
    }

    public long getFollowingCount(Long userId) {
        return followRepository.countByFollowerId(userId);
    }

    public List<UserFollow> getFollowers(Long userId) {
        return followRepository.findByFollowedId(userId);
    }

    public List<UserFollow> getFollowing(Long userId) {
        return followRepository.findByFollowerId(userId);
    }
}
