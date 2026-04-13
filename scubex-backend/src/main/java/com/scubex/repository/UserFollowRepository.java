package com.scubex.repository;

import com.scubex.model.User;
import com.scubex.model.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {

    Optional<UserFollow> findByFollowerIdAndFollowedId(Long followerId, Long followedId);

    boolean existsByFollowerIdAndFollowedId(Long followerId, Long followedId);

    long countByFollowedId(Long followedId);

    long countByFollowerId(Long followerId);

    List<UserFollow> findByFollowerId(Long followerId);

    List<UserFollow> findByFollowedId(Long followedId);
}
