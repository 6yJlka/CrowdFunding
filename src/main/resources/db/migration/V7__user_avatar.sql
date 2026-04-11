ALTER TABLE users
    ADD COLUMN avatar_content_type VARCHAR(120),
    ADD COLUMN avatar_bytes BYTEA;
