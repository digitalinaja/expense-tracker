-- ============================================
-- Expense Tracker Database Schema
-- Cloudflare D1 (SQLite)
-- Multi-Project Budget Management System
-- ============================================

-- Drop tables if they exist (for clean migration)
-- Note: Drop order matters due to foreign keys
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS planning;
DROP TABLE IF EXISTS projects;

-- ============================================
-- Projects Table (Top Level)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Planning Table (Middle Level)
-- ============================================
CREATE TABLE IF NOT EXISTS planning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Expenses Table (Bottom Level)
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
-- Indexes for Performance
-- ============================================

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_name
ON projects(name);

CREATE INDEX IF NOT EXISTS idx_projects_dates
ON projects(start_date, end_date);

-- Planning indexes
CREATE INDEX IF NOT EXISTS idx_planning_date
ON planning(date DESC);

CREATE INDEX IF NOT EXISTS idx_planning_project_id
ON planning(project_id);

CREATE INDEX IF NOT EXISTS idx_planning_project_date
ON planning(project_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_planning_amount
ON planning(amount);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date
ON expenses(date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_planning_id
ON expenses(planning_id);

CREATE INDEX IF NOT EXISTS idx_expenses_planning_date
ON expenses(planning_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_amount
ON expenses(amount);

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert sample projects
INSERT INTO projects (name, description, start_date, end_date)
VALUES
    ('Libur Ramadhan 2026', 'Budget liburan untuk bulan Ramadhan 2026', '2026-03-01', '2026-04-10'),
    ('Maret 2026', 'Budget bulanan untuk Maret 2026', '2026-03-01', '2026-03-31'),
    ('Lebaran 2026', 'Budget untuk persiapan dan perayaan Lebaran 2026', '2026-04-01', '2026-04-15');

-- Insert sample planning untuk project "Libur Ramadhan 2026" (project_id = 1)
INSERT INTO planning (project_id, name, amount, date)
VALUES
    (1, 'Transportasi', 500000, '2026-03-05'),
    (1, 'Akomodasi Hotel', 2000000, '2026-03-05'),
    (1, 'Makanan Selama Libur', 800000, '2026-03-05');

-- Insert sample planning untuk project "Maret 2026" (project_id = 2)
INSERT INTO planning (project_id, name, amount, date)
VALUES
    (2, 'Belanja Bulanan', 500000, '2026-03-01'),
    (2, 'Transportasi', 200000, '2026-03-01'),
    (2, 'Tagihan Internet', 150000, '2026-03-01');

-- Insert sample planning untuk project "Lebaran 2026" (project_id = 3)
INSERT INTO planning (project_id, name, amount, date)
VALUES
    (3, 'Baju Lebaran', 1000000, '2026-03-15'),
    (3, 'Ketupat dan Opor', 300000, '2026-04-05'),
    (3, 'THR Pembantu', 500000, '2026-03-20');

-- Insert sample expenses (dengan planning categorization)
INSERT INTO expenses (name, amount, date, planning_id)
VALUES
    ('Tiket Kereta Api', 250000, '2026-03-10', 1),
    ('Booking Hotel 3 Malam', 600000, '2026-03-10', 2),
    ('Makan Malam di Restoran', 150000, '2026-03-12', 3),
    ('Beli Kemeja', 300000, '2026-03-16', 7),
    ('Semako Ketupat', 100000, '2026-04-02', 8),
    ('Belanja di Pasar', 200000, '2026-03-05', 4);

-- Insert sample expense (uncategorized/tanpa planning)
INSERT INTO expenses (name, amount, date)
VALUES ('Pengeluaran Tak Terduga', 50000, '2026-03-15');

-- ============================================
-- Validation Queries (to verify schema)
-- ============================================

-- View all projects
-- SELECT * FROM projects ORDER BY name;

-- View all planning dengan project info
-- SELECT p.name as project_name, pl.name as planning_name, pl.amount
-- FROM planning pl
-- JOIN projects p ON pl.project_id = p.id
-- ORDER BY p.name, pl.date DESC;

-- View all expenses dengan planning dan project info
-- SELECT
--     prj.name as project_name,
--     pl.name as planning_name,
--     e.name as expense_name,
--     e.amount
-- FROM expenses e
-- LEFT JOIN planning pl ON e.planning_id = pl.id
-- LEFT JOIN projects prj ON pl.project_id = prj.id
-- ORDER BY prj.name, e.date DESC;

-- View project summary
-- SELECT
--     p.name,
--     COALESCE(SUM(pl.amount), 0) as total_budget,
--     COALESCE(SUM(e.amount), 0) as total_expenses
-- FROM projects p
-- LEFT JOIN planning pl ON p.id = pl.project_id
-- LEFT JOIN expenses e ON pl.id = e.planning_id
-- GROUP BY p.id, p.name;
