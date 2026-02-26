-- V3__indexes.sql

-- users
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_status_endat ON projects(status, end_at);
CREATE INDEX IF NOT EXISTS idx_projects_category_status ON projects(category_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_author ON projects(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_title ON projects(title);

-- updates
CREATE INDEX IF NOT EXISTS idx_updates_project_created ON project_updates(project_id, created_at DESC);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_project_created ON comments(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- donations
CREATE INDEX IF NOT EXISTS idx_donations_project_status ON donations(project_id, status);
CREATE INDEX IF NOT EXISTS idx_donations_sponsor_created ON donations(sponsor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_project_created ON donations(project_id, created_at DESC);