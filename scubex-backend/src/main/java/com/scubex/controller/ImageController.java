package com.scubex.controller;

import com.scubex.model.UploadedImage;
import com.scubex.repository.ImageRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private final ImageRepository imageRepository;

    public ImageController(ImageRepository imageRepository) {
        this.imageRepository = imageRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        if (file.getSize() > MAX_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "File too large (max 5 MB)"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only JPEG, PNG, GIF and WebP allowed"));
        }

        try {
            UploadedImage image = UploadedImage.builder()
                    .data(file.getBytes())
                    .contentType(contentType)
                    .build();
            UploadedImage saved = imageRepository.save(image);
            return ResponseEntity.ok(Map.of("imageUrl", "/api/images/" + saved.getId()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to read file"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return imageRepository.findById(id)
                .map(img -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, img.getContentType())
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                        .body(img.getData()))
                .orElse(ResponseEntity.notFound().build());
    }
}
