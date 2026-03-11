-- ============================================
-- Migration 002: Add Expense Categorization
-- Add planning_id foreign key to expenses table
-- ============================================

-- Add planning_id column (nullable for backward compatibility)
ALTER TABLE expenses ADD COLUMN planning_id INTEGER;

-- Add foreign key constraint
-- Note: SQLite doesn't support ALTER TABLE ADD CONSTRAINT directly
-- So we'll handle this at application level

-- Create index for planning_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_expenses_planning_id
ON expenses(planning_id);

-- Create composite index for planning_id + date queries
CREATE INDEX IF NOT EXISTS idx_expenses_planning_date
ON expenses(planning_id, date DESC);

-- Verify migration
-- Run this to check:
-- PRAGMA table_info(expenses);
-- SELECT * FROM sqlite_master WHERE type='index' AND tbl_name='expenses';
