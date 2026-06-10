package com.scubex.service;

import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final UserFollowRepository userFollowRepository;
    private final PublicationRepository publicationRepository;
    private final CommentRepository commentRepository;
    private final PublicationLikeRepository publicationLikeRepository;
    private final PublicationSaveRepository publicationSaveRepository;

    public UserService(UserRepository userRepository,
                       NotificationRepository notificationRepository,
                       UserFollowRepository userFollowRepository,
                       PublicationRepository publicationRepository,
                       CommentRepository commentRepository,
                       PublicationLikeRepository publicationLikeRepository,
                       PublicationSaveRepository publicationSaveRepository) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.userFollowRepository = userFollowRepository;
        this.publicationRepository = publicationRepository;
        this.commentRepository = commentRepository;
        this.publicationLikeRepository = publicationLikeRepository;
        this.publicationSaveRepository = publicationSaveRepository;
    }

    public User findOrCreate(String googleId, String email, String name, String pictureUrl) {
        return userRepository.findByGoogleId(googleId)
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .googleId(googleId)
                                .email(email)
                                .name(name)
                                .pictureUrl(pictureUrl)
                                .build()
                ));
    }

    public User findByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId).orElse(null);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public User updateProfile(String googleId, String customName, String customPictureUrl, Boolean accountPrivate) {
        User user = userRepository.findByGoogleId(googleId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setCustomName(customName);
        user.setCustomPictureUrl(customPictureUrl);
        if (accountPrivate != null) {
            user.setAccountPrivate(accountPrivate);
        }
        return userRepository.save(user);
    }

    @Transactional
    public void deleteAccount(String googleId) {
        User user = userRepository.findByGoogleId(googleId).orElse(null);
        if (user == null) return;
        Long userId = user.getId();

        // 1. Delete notifications received by this user
        notificationRepository.deleteAllByRecipientId(userId);

        // 2. Delete follow relationships (as follower and as followed)
        userFollowRepository.deleteAllByFollowerId(userId);
        userFollowRepository.deleteAllByFollowedId(userId);

        // 3. Collect user's publications to delete their interactions first
        List<Publication> pubs = publicationRepository.findByUser(user);
        if (!pubs.isEmpty()) {
            List<Long> pubIds = pubs.stream().map(Publication::getId).toList();
            commentRepository.deleteAllByPublicationIdIn(pubIds);
            publicationLikeRepository.deleteAllByPublicationIdIn(pubIds);
            publicationSaveRepository.deleteAllByPublicationIdIn(pubIds);
        }

        // 4. Delete user's own interactions on other users' publications
        commentRepository.deleteAllByUserId(userId);
        publicationLikeRepository.deleteAllByUserId(userId);
        publicationSaveRepository.deleteAllByUserId(userId);

        // 5. Delete publications
        publicationRepository.deleteAll(pubs);

        // 6. Finally delete the user
        userRepository.delete(user);
    }
}
