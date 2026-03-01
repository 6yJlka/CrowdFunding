-- V5__project_reviews.sql

CREATE TABLE project_reviews (
                                 id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                 project_id UUID NOT NULL,
                                 user_id    UUID NOT NULL,
                                 rating     SMALLINT NOT NULL,
                                 review_text TEXT NOT NULL,
                                 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                                 CONSTRAINT fk_reviews_project FOREIGN KEY (project_id)
                                     REFERENCES projects(id) ON DELETE CASCADE,

                                 CONSTRAINT fk_reviews_user FOREIGN KEY (user_id)
                                     REFERENCES users(id) ON DELETE RESTRICT,

                                 CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
                                 CONSTRAINT uq_reviews_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_project_created
    ON project_reviews(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_project_rating
    ON project_reviews(project_id, rating);