package com.scubex.service;

import com.scubex.model.User;
import com.scubex.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
}
