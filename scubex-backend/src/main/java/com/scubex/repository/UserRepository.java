package com.scubex.repository;

import com.scubex.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByGoogleId(String googleId);
    Optional<User> findByEmail(String email);
    List<User> findByEmailIn(Collection<String> emails);

    @Query("SELECT u FROM User u WHERE " +
           "LOWER(COALESCE(u.customName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchByQuery(@Param("q") String q, Pageable pageable);
}
