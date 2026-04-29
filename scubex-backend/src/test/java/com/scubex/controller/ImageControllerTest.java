package com.scubex.controller;

import com.scubex.model.UploadedImage;
import com.scubex.repository.ImageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test suite para ImageController.
 * Tests cover:
 * - Subida sin autenticación devuelve 401
 * - Archivo vacío devuelve 400
 * - Archivo mayor de 5 MB devuelve 400 sin persistir
 * - Content-Type null devuelve 400
 * - Content-Type no permitido devuelve 400 sin persistir
 * - Subida válida devuelve 200 con imageUrl y persiste
 * - GET imagen existente devuelve 200 con bytes y Content-Type
 * - GET imagen inexistente devuelve 404
 */
@ExtendWith(MockitoExtension.class)
class ImageControllerTest {

    @Mock
    private ImageRepository imageRepository;

    @InjectMocks
    private ImageController imageController;

    private MockMvc mockMvc;

    /** Authenticated principal reutilizable entre tests */
    private final UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken("google-123", null, List.of());

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(imageController).build();
    }

    // ── helpers ──────────────────────────────────────────────────────

    /** 1-byte JPEG válido (por debajo del límite de tamaño). */
    private MockMultipartFile validFile() {
        return new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{0x1});
    }

    /** Archivo vacío (0 bytes). */
    private MockMultipartFile emptyFile() {
        return new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);
    }

    /** Archivo que supera los 5 MB. */
    private MockMultipartFile oversizedFile() {
        byte[] bigData = new byte[5 * 1024 * 1024 + 1];
        return new MockMultipartFile("file", "big.jpg", "image/jpeg", bigData);
    }

    /** Archivo con MIME type no permitido. */
    private MockMultipartFile pdfFile() {
        return new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[]{0x1});
    }

    /** Archivo con Content-Type null. */
    private MockMultipartFile nullContentTypeFile() {
        return new MockMultipartFile("file", "photo.bin", null, new byte[]{0x1});
    }

    // ── upload tests ─────────────────────────────────────────────────

    /**
     * Test: upload_unauthenticated_returns401
     * Sin sesión activa (Authentication == null) devuelve 401 sin persistir.
     */
    @Test
    void upload_unauthenticated_returns401() throws Exception {
        mockMvc.perform(multipart("/api/images/upload")
                        .file(validFile()))
                .andExpect(status().isUnauthorized());

        verify(imageRepository, never()).save(any());
    }

    /**
     * Test: upload_emptyFile_returns400
     * Un archivo sin bytes devuelve 400 sin persistir nada.
     */
    @Test
    void upload_emptyFile_returns400() throws Exception {
        mockMvc.perform(multipart("/api/images/upload")
                        .file(emptyFile())
                        .principal(auth))
                .andExpect(status().isBadRequest());

        verify(imageRepository, never()).save(any());
    }

    /**
     * Test: upload_fileTooLarge_returns400
     * Un archivo superior a 5 MB devuelve 400 sin persistir.
     */
    @Test
    void upload_fileTooLarge_returns400() throws Exception {
        mockMvc.perform(multipart("/api/images/upload")
                        .file(oversizedFile())
                        .principal(auth))
                .andExpect(status().isBadRequest());

        verify(imageRepository, never()).save(any());
    }

    /**
     * Test: upload_nullContentType_returns400
     * Content-Type null (rama izquierda del OR) devuelve 400 sin persistir.
     */
    @Test
    void upload_nullContentType_returns400() throws Exception {
        mockMvc.perform(multipart("/api/images/upload")
                        .file(nullContentTypeFile())
                        .principal(auth))
                .andExpect(status().isBadRequest());

        verify(imageRepository, never()).save(any());
    }

    /**
     * Test: upload_invalidMimeType_returns400
     * Content-Type no permitido devuelve 400 sin persistir.
     */
    @Test
    void upload_invalidMimeType_returns400() throws Exception {
        mockMvc.perform(multipart("/api/images/upload")
                        .file(pdfFile())
                        .principal(auth))
                .andExpect(status().isBadRequest());

        verify(imageRepository, never()).save(any());
    }

    /**
     * Test: upload_validFile_returns200WithImageUrl
     * Archivo JPEG válido con usuario autenticado: devuelve 200 con imageUrl
     * y llama a imageRepository.save exactamente una vez.
     */
    @Test
    void upload_validFile_returns200WithImageUrl() throws Exception {
        UploadedImage saved = UploadedImage.builder()
                .id(42L)
                .data(new byte[]{0x1})
                .contentType("image/jpeg")
                .build();
        when(imageRepository.save(any(UploadedImage.class))).thenReturn(saved);

        mockMvc.perform(multipart("/api/images/upload")
                        .file(validFile())
                        .principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl").value("/api/images/42"));

        verify(imageRepository, times(1)).save(any(UploadedImage.class));
    }

    // ── GET tests ────────────────────────────────────────────────────

    /**
     * Test: get_existingImage_returns200WithBytes
     * Una imagen existente devuelve 200, el Content-Type correcto y los bytes.
     */
    @Test
    void get_existingImage_returns200WithBytes() throws Exception {
        byte[] imageData = new byte[]{(byte) 0xFF, (byte) 0xD8};
        UploadedImage img = UploadedImage.builder()
                .id(7L)
                .data(imageData)
                .contentType("image/jpeg")
                .build();
        when(imageRepository.findById(7L)).thenReturn(Optional.of(img));

        mockMvc.perform(get("/api/images/7"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(content().bytes(imageData));
    }

    /**
     * Test: get_nonExistingImage_returns404
     * Una imagen que no existe en BD devuelve 404.
     */
    @Test
    void get_nonExistingImage_returns404() throws Exception {
        when(imageRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/images/999"))
                .andExpect(status().isNotFound());
    }
}
