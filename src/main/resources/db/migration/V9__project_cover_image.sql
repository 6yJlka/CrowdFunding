alter table projects
    add column if not exists cover_image_content_type varchar(120),
    add column if not exists cover_image_bytes bytea;
