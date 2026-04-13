package com.scubex.repository;

import com.scubex.model.UploadedImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageRepository extends JpaRepository<UploadedImage, Long> {
}
