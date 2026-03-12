-- ============================================
-- Migration 002: Add Authentication and Collaboration
-- ============================================
-- This migration adds:
-- 1. User authentication system
-- 2. Project collaboration features
-- 3. Session management
-- ============================================

-- ============================================
-- Step 1: Create new tables
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Collaborators Table
CREATE TABLE IF NOT EXISTS project_collaborators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('editor', 'viewer')) DEFAULT 'viewer',
    invited_by INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

-- Sessions Table (for JWT token management)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Step 2: Modify existing tables
-- ============================================

-- Add user ownership to projects table
-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN with FOREIGN KEY directly
-- We'll add the column first, then the constraint will be enforced at application level
ALTER TABLE projects ADD COLUMN owner_id INTEGER NOT NULL DEFAULT 1;

-- ============================================
-- Step 3: Create indexes for performance
-- ============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Collaborator indexes
CREATE INDEX IF NOT EXISTS idx_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_status ON project_collaborators(status);
CREATE INDEX IF NOT EXISTS idx_collaborators_invited_by ON project_collaborators(invited_by);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Project ownership index
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- ============================================
-- Step 4: Create system user and migrate data
-- ============================================

-- Create system user for existing data
INSERT INTO users (google_id, email, name)
VALUES ('system_user', 'system@local', 'System User');

-- Verify system user was created
-- The system user should have id = 1

-- Note: Existing projects already have owner_id = 1 as default
-- No need to update existing data

-- ============================================
-- Step 5: Validation queries (for testing)
-- ============================================

-- Check users table
-- SELECT * FROM users;

-- Check project_collaborators table
-- SELECT * FROM project_collaborators;

-- Check projects with owner
-- SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id;

-- Count projects by owner
-- SELECT owner_id, u.name, COUNT(*) as project_count FROM projects p JOIN users u ON p.owner_id = u.id GROUP BY owner_id;

-- ============================================
-- Rollback instructions (if needed)
-- ============================================
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS project_collaborators;
-- DROP TABLE IF EXISTS users;
-- Note: You cannot drop columns in SQLite, so you would need to recreate the projects table
-- to remove the owner_id column
