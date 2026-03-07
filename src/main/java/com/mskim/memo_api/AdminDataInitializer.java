package com.mskim.memo_api;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("local")
public class AdminDataInitializer {

    @Bean
    CommandLineRunner seedAdminUser(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder
    ) {
        return args -> {
            String adminLoginId = "admin";
            String adminPassword = "admin1234";

            if (userRepository.existsByLoginId(adminLoginId)) {
                return;
            }

            User admin = new User(
                adminLoginId,
                passwordEncoder.encode(adminPassword),
                UserRole.ADMIN
            );

            userRepository.save(admin);
            System.out.println("[seed] admin user created: " + adminLoginId);
        };
    }
}