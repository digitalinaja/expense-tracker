-- ============================================
-- Migration 004: Add Project to Planning
-- Add project_id foreign key to planning table and migrate existing data
-- ============================================

-- Add project_id column to planning table (nullable initially for migration)
ALTER TABLE planning ADD COLUMN project_id INTEGER;

-- Create default project for existing planning data
INSERT INTO projects (name, description, start_date, end_date)
VALUES (
    'Default Project',
    'Project default yang berisi planning yang ada sebelum fitur multi-project ditambahkan',
    NULL,
    NULL
);

-- Migrate existing planning to default project (project_id = 1)
UPDATE planning
SET project_id = 1
WHERE project_id IS NULL;

-- Create index for project_id
CREATE INDEX IF NOT EXISTS idx_planning_project_id
ON planning(project_id);

-- Create composite index for project + date queries
CREATE INDEX IF NOT EXISTS idx_planning_project_date
ON planning(project_id, date DESC);

-- Verify migration
-- Run: PRAGMA table_info(planning);
-- Run: SELECT p.name, pl.name, pl.project_id FROM planning pl LEFT JOIN projects p ON pl.project_id = p.id LIMIT 5;
-- Run: SELECT COUNT(*) as planning_without_project FROM planning WHERE project_id IS NULL;
