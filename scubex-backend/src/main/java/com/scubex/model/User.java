package com.scubex.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String googleId;

    @Column(nullable = false)
    private String email;

    private String name;

    private String pictureUrl;

    // Custom profile overrides (user-set, persisted independently of Google)
    private String customName;

    private String customPictureUrl;

    /** Returns customName if set, otherwise the Google name. */
    public String getDisplayName() {
        return customName != null && !customName.isBlank() ? customName : name;
    }

    /** Returns customPictureUrl if set, otherwise the Google picture. */
    public String getDisplayPicture() {
        return customPictureUrl != null && !customPictureUrl.isBlank() ? customPictureUrl : pictureUrl;
    }
}
