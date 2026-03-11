-- ============================================
-- Migration 003: Add Projects Table
-- Create top-level projects entity
-- ============================================

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for project name
CREATE INDEX IF NOT EXISTS idx_projects_name
ON projects(name);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_projects_dates
ON projects(start_date, end_date);

-- Verify migration
-- Run: PRAGMA table_info(projects);
-- Run: SELECT * FROM projects;
