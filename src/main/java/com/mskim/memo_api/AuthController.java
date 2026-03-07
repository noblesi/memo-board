package com.mskim.memo_api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthController(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    public record SignupReq(
        @NotBlank @Size(min = 4, max = 50) String loginId,
        @NotBlank @Size(min = 4, max = 100) String password
    ) {}

    public record LoginReq(
        @NotBlank String loginId,
        @NotBlank String password
    ) {}

    public record UserRes(
        boolean authenticated,
        Long id,
        String loginId,
        String role
    ) {}

    public record SignupRes(
        Long id,
        String loginId,
        String role
    ) {}

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public SignupRes signup(@Valid @RequestBody SignupReq req) {
        if (userRepository.existsByLoginId(req.loginId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "loginId already exists");
        }

        User user = new User(
            req.loginId(),
            passwordEncoder.encode(req.password()),
            UserRole.USER
        );

        User saved = userRepository.save(user);

        return new SignupRes(
            saved.getId(),
            saved.getLoginId(),
            saved.getRole().name()
        );
    }

    @PostMapping("/login")
    public UserRes login(@Valid @RequestBody LoginReq req, HttpServletRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.loginId(), req.password())
            );

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            HttpSession session = request.getSession(true);
            session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                context
            );

            User user = userRepository.findByLoginId(req.loginId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found"));

            return new UserRes(
                true,
                user.getId(),
                user.getLoginId(),
                user.getRole().name()
            );
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
    }

    @GetMapping("/me")
    public UserRes me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
        }

        String loginId = authentication.getName();

        User user = userRepository.findByLoginId(loginId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found"));

        return new UserRes(
            true,
            user.getId(),
            user.getLoginId(),
            user.getRole().name()
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }
}