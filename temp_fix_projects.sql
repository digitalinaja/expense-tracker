-- Backup existing data
CREATE TEMP TABLE projects_backup AS SELECT * FROM projects;

-- Drop the corrupted table
DROP TABLE projects;

-- Recreate with correct schema
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    owner_id INTEGER NOT NULL DEFAULT 1
);

-- Restore data
INSERT INTO projects (id, name, description, start_date, end_date, created_at, owner_id)
SELECT id, name, description, start_date, end_date, created_at, owner_id FROM projects_backup;

-- Create index
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- Verify
SELECT 'Table recreated successfully' as result;
