-- V4__seeds.sql

INSERT INTO roles(code, name) VALUES
                                  ('AUTHOR',  'Автор проекта'),
                                  ('SPONSOR', 'Спонсор'),
                                  ('ADMIN',   'Администратор')
    ON CONFLICT (code) DO NOTHING;

INSERT INTO categories(slug, title, is_active) VALUES
                                                   ('tech', 'Технологии', TRUE),
                                                   ('art', 'Творчество', TRUE),
                                                   ('social', 'Социальные проекты', TRUE),
                                                   ('education', 'Образование', TRUE),
                                                   ('charity', 'Благотворительность', TRUE)
    ON CONFLICT (slug) DO NOTHING;