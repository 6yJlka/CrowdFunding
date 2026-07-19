package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.api.dto.UserAvatarResponse;
import ru.donskikh.crowdfunding.api.dto.UserBioUpdateRequest;
import ru.donskikh.crowdfunding.api.dto.UserProfileResponse;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import ru.donskikh.crowdfunding.service.UserProfileService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

@Service
public class UserProfileServiceImpl implements UserProfileService {

    private static final long MAX_AVATAR_SIZE_BYTES = 5L * 1024 * 1024;
    private static final int AVATAR_SIZE = 256;

    private final UserRepository userRepository;

    public UserProfileServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentProfile(UUID userId) {
        UserEntity entity = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        UserProfileResponse response = new UserProfileResponse();
        response.setId(entity.getId());
        response.setEmail(entity.getEmail());
        response.setDisplayName(entity.getDisplayName());
        response.setBio(entity.getBio());
        response.setCreatedAt(entity.getCreatedAt());
        response.setRoles(entity.getRoles().stream().map(role -> "ROLE_" + role.getCode().name()).toList());
        response.setHasAvatar(entity.getAvatarContentType() != null && !entity.getAvatarContentType().isBlank());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public UserAvatarResponse getCurrentAvatar(UUID userId) {
        UserEntity entity = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        byte[] avatar = entity.getAvatarBytes();
        if (avatar == null || avatar.length == 0) {
            throw new EntityNotFoundException("Avatar not found");
        }

        return new UserAvatarResponse(avatar, entity.getAvatarContentType());
    }

    @Override
    @Transactional
    public UserProfileResponse updateBio(UUID userId, UserBioUpdateRequest request) {
        UserEntity entity = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        entity.setBio(request.getBio().trim());
        userRepository.save(entity);

        UserProfileResponse response = new UserProfileResponse();
        response.setId(entity.getId());
        response.setEmail(entity.getEmail());
        response.setDisplayName(entity.getDisplayName());
        response.setBio(entity.getBio());
        response.setCreatedAt(entity.getCreatedAt());
        response.setRoles(entity.getRoles().stream().map(role -> "ROLE_" + role.getCode().name()).toList());
        response.setHasAvatar(entity.getAvatarContentType() != null && !entity.getAvatarContentType().isBlank());
        return response;
    }

    @Override
    @Transactional
    public void updateAvatar(UUID userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Avatar file is required");
        }
        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new IllegalArgumentException("Avatar must be 5 MB or smaller");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Avatar must be an image");
        }

        UserEntity entity = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        try {
            AvatarImage avatarImage = normalizeAvatar(file.getBytes());
            entity.setAvatarContentType(avatarImage.contentType());
            entity.setAvatarBytes(avatarImage.bytes());
            userRepository.save(entity);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not read avatar file");
        }
    }

    private AvatarImage normalizeAvatar(byte[] sourceBytes) throws IOException {
        BufferedImage source = ImageIO.read(new ByteArrayInputStream(sourceBytes));
        if (source == null) {
            throw new IllegalArgumentException("Avatar file must be a valid image");
        }

        BufferedImage trimmed = trimAvatarBounds(source);
        BufferedImage squared = renderSquaredAvatar(trimmed);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(squared, "png", outputStream);
        return new AvatarImage(outputStream.toByteArray(), "image/png");
    }

    private BufferedImage trimAvatarBounds(BufferedImage source) {
        int minX = source.getWidth();
        int minY = source.getHeight();
        int maxX = -1;
        int maxY = -1;

        for (int y = 0; y < source.getHeight(); y++) {
            for (int x = 0; x < source.getWidth(); x++) {
                int argb = source.getRGB(x, y);
                if (!isAvatarContentPixel(argb)) {
                    continue;
                }
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }

        if (maxX < minX || maxY < minY) {
            return source;
        }

        int paddingX = Math.max(8, (maxX - minX + 1) / 10);
        int paddingY = Math.max(8, (maxY - minY + 1) / 10);
        int fromX = Math.max(0, minX - paddingX);
        int fromY = Math.max(0, minY - paddingY);
        int toX = Math.min(source.getWidth() - 1, maxX + paddingX);
        int toY = Math.min(source.getHeight() - 1, maxY + paddingY);

        return source.getSubimage(fromX, fromY, toX - fromX + 1, toY - fromY + 1);
    }

    private boolean isAvatarContentPixel(int argb) {
        int alpha = (argb >>> 24) & 0xff;
        if (alpha <= 16) {
            return false;
        }

        int red = (argb >>> 16) & 0xff;
        int green = (argb >>> 8) & 0xff;
        int blue = argb & 0xff;

        return red < 245 || green < 245 || blue < 245;
    }

    private BufferedImage renderSquaredAvatar(BufferedImage source) {
        BufferedImage target = new BufferedImage(AVATAR_SIZE, AVATAR_SIZE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = target.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        int sourceWidth = source.getWidth();
        int sourceHeight = source.getHeight();
        double scale = Math.max((double) AVATAR_SIZE / sourceWidth, (double) AVATAR_SIZE / sourceHeight);
        int drawWidth = Math.max(1, (int) Math.round(sourceWidth * scale));
        int drawHeight = Math.max(1, (int) Math.round(sourceHeight * scale));
        int drawX = (AVATAR_SIZE - drawWidth) / 2;
        int drawY = (AVATAR_SIZE - drawHeight) / 2;

        graphics.drawImage(source, drawX, drawY, drawWidth, drawHeight, null);
        graphics.dispose();
        return target;
    }

    private record AvatarImage(byte[] bytes, String contentType) {
    }
}
