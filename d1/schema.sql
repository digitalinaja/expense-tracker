-- ============================================
-- Expense Tracker Database Schema
-- Cloudflare D1 (SQLite)
-- ============================================

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS planning;

-- ============================================
-- Expenses Table
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    planning_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Planning Table
-- ============================================
CREATE TABLE IF NOT EXISTS planning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index for expenses date queries
CREATE INDEX IF NOT EXISTS idx_expenses_date
ON expenses(date DESC);

-- Index for planning date queries
CREATE INDEX IF NOT EXISTS idx_planning_date
ON planning(date DESC);

-- Index for expenses amount queries (for summary calculations)
CREATE INDEX IF NOT EXISTS idx_expenses_amount
ON expenses(amount);

-- Index for planning amount queries (for summary calculations)
CREATE INDEX IF NOT EXISTS idx_planning_amount
ON planning(amount);

-- Index for expenses planning_id queries (for categorization)
CREATE INDEX IF NOT EXISTS idx_expenses_planning_id
ON expenses(planning_id);

-- Composite index for planning_id + date queries
CREATE INDEX IF NOT EXISTS idx_expenses_planning_date
ON expenses(planning_id, date DESC);

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert sample planning
INSERT INTO planning (name, amount, date)
VALUES
    ('Belanja Bulanan', 500000, '2024-01-20'),
    ('Transportasi', 200000, '2024-01-20'),
    ('Makanan', 300000, '2024-01-20');

-- Insert sample expense (with categorization)
INSERT INTO expenses (name, amount, date, planning_id)
VALUES
    ('Belanja di Supermarket', 150000, '2024-01-21', 1),
    ('Bensin Motor', 50000, '2024-01-21', 2),
    ('Makan Siang', 25000, '2024-01-21', 3);

-- Insert sample expense (uncategorized)
INSERT INTO expenses (name, amount, date)
VALUES ('Pengeluaran Lain', 10000, '2024-01-21');

-- ============================================
-- Validation Queries (to verify schema)
-- ============================================

-- View all expenses
-- SELECT * FROM expenses ORDER BY date DESC;

-- View all planning
-- SELECT * FROM planning ORDER BY date DESC;

-- View summary
-- SELECT
--     (SELECT COALESCE(SUM(amount), 0) FROM expenses) as total_expenses,
--     (SELECT COALESCE(SUM(amount), 0) FROM planning) as total_planning,
--     (SELECT COALESCE(SUM(amount), 0) FROM planning) - (SELECT COALESCE(SUM(amount), 0) FROM expenses) as remaining_balance;
