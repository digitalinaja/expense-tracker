-- ============================================
-- Migration 001: Initial Schema
-- ============================================
-- This migration creates the base tables
-- ============================================

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    planning_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Planning Table
CREATE TABLE IF NOT EXISTS planning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_planning_id ON expenses(planning_id);

-- Indexes for planning
CREATE INDEX IF NOT EXISTS idx_planning_project_id ON planning(project_id);
CREATE INDEX IF NOT EXISTS idx_planning_date ON planning(date);
