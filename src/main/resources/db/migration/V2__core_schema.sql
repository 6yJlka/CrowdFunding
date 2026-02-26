-- V2__core_schema.sql

-- ====== USERS / ROLES ======
CREATE TABLE users (
                       id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       email           VARCHAR(255) NOT NULL UNIQUE,
                       password_hash   VARCHAR(255) NOT NULL,
                       display_name    VARCHAR(120) NOT NULL,
                       status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
                       created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
                       updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
                       CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE','BLOCKED','DELETED'))
);

CREATE TABLE roles (
                       id    SMALLSERIAL PRIMARY KEY,
                       code  VARCHAR(30)  NOT NULL UNIQUE,
                       name  VARCHAR(80)  NOT NULL
);

CREATE TABLE user_roles (
                            user_id UUID NOT NULL,
                            role_id INT  NOT NULL,
                            PRIMARY KEY (user_id, role_id),
                            CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- ====== CATEGORIES ======
CREATE TABLE categories (
                            id         BIGSERIAL PRIMARY KEY,
                            slug       VARCHAR(60)  NOT NULL UNIQUE,
                            title      VARCHAR(120) NOT NULL,
                            is_active  BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ====== PROJECTS ======
CREATE TABLE projects (
                          id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          author_id         UUID NOT NULL,
                          category_id       BIGINT NULL,
                          title             VARCHAR(180) NOT NULL,
                          short_description VARCHAR(300) NOT NULL,
                          description       TEXT NOT NULL,
                          goal_amount       NUMERIC(14,2) NOT NULL,
                          currency          CHAR(3) NOT NULL DEFAULT 'RUB',
                          collected_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
                          status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
                          start_at          TIMESTAMPTZ NULL,
                          end_at            TIMESTAMPTZ NULL,
                          created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
                          updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

                          CONSTRAINT fk_projects_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
                          CONSTRAINT fk_projects_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,

                          CONSTRAINT chk_projects_goal_amount CHECK (goal_amount > 0),
                          CONSTRAINT chk_projects_collected_amount CHECK (collected_amount >= 0),
                          CONSTRAINT chk_projects_status CHECK (status IN ('DRAFT','MODERATION','ACTIVE','FUNDED','CLOSED','REJECTED')),
                          CONSTRAINT chk_projects_dates CHECK (end_at IS NULL OR start_at IS NULL OR end_at > start_at)
);

-- ====== PROJECT UPDATES ======
CREATE TABLE project_updates (
                                 id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                 project_id UUID NOT NULL,
                                 author_id  UUID NOT NULL,
                                 title      VARCHAR(180) NOT NULL,
                                 content    TEXT NOT NULL,
                                 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                                 CONSTRAINT fk_updates_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                                 CONSTRAINT fk_updates_author  FOREIGN KEY (author_id)  REFERENCES users(id)    ON DELETE RESTRICT
);

-- ====== COMMENTS ======
CREATE TABLE comments (
                          id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          project_id UUID NOT NULL,
                          user_id    UUID NOT NULL,
                          parent_id  UUID NULL,
                          content    TEXT NOT NULL,
                          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                          CONSTRAINT fk_comments_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                          CONSTRAINT fk_comments_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE RESTRICT,
                          CONSTRAINT fk_comments_parent  FOREIGN KEY (parent_id)  REFERENCES comments(id) ON DELETE CASCADE
);

-- ====== DONATIONS (demo payments) ======
CREATE TABLE donations (
                           id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           project_id           UUID NOT NULL,
                           sponsor_id           UUID NOT NULL,
                           amount               NUMERIC(14,2) NOT NULL,
                           status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                           provider             VARCHAR(40) NULL,
                           external_payment_id  VARCHAR(120) NULL,
                           created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
                           confirmed_at         TIMESTAMPTZ NULL,

                           CONSTRAINT fk_donations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
                           CONSTRAINT fk_donations_sponsor FOREIGN KEY (sponsor_id) REFERENCES users(id)    ON DELETE RESTRICT,

                           CONSTRAINT chk_donations_amount CHECK (amount > 0),
                           CONSTRAINT chk_donations_status CHECK (status IN ('PENDING','SUCCEEDED','FAILED','CANCELED'))
);