-- ============================================
-- Add Attachments Table for Expense Images
-- Migration 006
-- ============================================

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,  -- R2 object key
    width INTEGER,
    height INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attachments_expense_id
ON attachments(expense_id);

CREATE INDEX IF NOT EXISTS idx_attachments_created_at
ON attachments(created_at DESC);

-- Add comment for documentation
-- Note: R2_KEY format: expenses/{expense_id}/{timestamp}_{file_id}.{ext}
-- Example: expenses/123/1704067200000_1.jpg
