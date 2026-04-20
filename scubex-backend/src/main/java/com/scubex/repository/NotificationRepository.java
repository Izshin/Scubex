package com.scubex.repository;

import com.scubex.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    long countByRecipientIdAndReadFalse(Long recipientId);
    List<Notification> findByRecipientIdAndReadFalse(Long recipientId);

    void deleteAllByRecipientId(Long recipientId);
}
