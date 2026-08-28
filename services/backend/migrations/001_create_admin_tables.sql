-- =====================================================
-- myInstaShop Admin Portal - Database Extensions
-- Migration: 001_create_admin_tables.sql
-- Purpose: Add admin user management and audit logging
-- =====================================================

-- Admin Users Table
-- Stores admin user credentials and profile information
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operations' CHECK (role IN ('super_admin', 'admin', 'operations', 'support', 'financial')),
    permissions JSONB DEFAULT '{}',
    mfa_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Sessions Table
-- Manages admin authentication sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Audit Logs Table
-- Comprehensive logging of all admin actions for security and compliance
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    admin_email VARCHAR(255), -- Store email for historical record even if admin deleted
    action VARCHAR(100) NOT NULL, -- e.g., 'user_suspended', 'order_refunded', 'business_verified'
    resource_type VARCHAR(50) NOT NULL, -- e.g., 'user', 'business', 'order', 'system'
    resource_id UUID, -- ID of the affected resource
    details JSONB DEFAULT '{}', -- Additional context about the action
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Roles Table
-- Define available admin roles and their permissions
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Notifications Table
-- System notifications for admin users
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'system_alert', 'user_action_required', 'security_warning'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance Optimization
-- =====================================================

-- Admin Users Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_created_at ON admin_users(created_at);

-- Admin Sessions Indexes  
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active);

-- Admin Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_type ON admin_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource_id ON admin_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON admin_audit_logs(admin_email);

-- Admin Roles Indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON admin_roles(is_active);

-- Admin Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at);

-- =====================================================
-- SEED DEFAULT ADMIN ROLES
-- =====================================================

-- Insert default admin roles
INSERT INTO admin_roles (name, display_name, description, permissions) VALUES 
(
    'super_admin',
    'Super Administrator', 
    'Full system access with all permissions',
    '{"users": ["read", "write", "delete", "suspend"], "businesses": ["read", "write", "verify", "suspend", "analytics"], "orders": ["read", "write", "cancel", "refund", "intervene"], "financial": ["read", "approve_withdrawals", "view_transactions", "generate_reports"], "support": ["read", "write", "assign", "escalate", "close"], "system": ["read", "configure", "monitor", "backup", "maintain"]}'::JSONB
),
(
    'admin', 
    'Administrator',
    'Administrative access with most permissions',
    '{"users": ["read", "write", "suspend"], "businesses": ["read", "write", "verify", "analytics"], "orders": ["read", "write", "cancel", "refund"], "financial": ["read", "approve_withdrawals", "view_transactions"], "support": ["read", "write", "assign", "close"], "system": ["read", "monitor"]}'::JSONB
),
(
    'operations',
    'Operations Manager', 
    'Daily operations and user management',
    '{"users": ["read", "write", "suspend"], "businesses": ["read", "write", "verify"], "orders": ["read", "write", "cancel"], "support": ["read", "write", "assign"], "system": ["read"]}'::JSONB
),
(
    'support',
    'Support Manager',
    'Customer support and ticket management', 
    '{"users": ["read"], "businesses": ["read"], "orders": ["read"], "support": ["read", "write", "assign", "close"], "system": ["read"]}'::JSONB
),
(
    'financial',
    'Financial Manager',
    'Financial operations and reporting',
    '{"users": ["read"], "businesses": ["read", "analytics"], "orders": ["read"], "financial": ["read", "approve_withdrawals", "view_transactions", "generate_reports"], "system": ["read"]}'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- =====================================================
-- CREATE DEFAULT SUPER ADMIN USER
-- =====================================================

-- Bootstrap admin is NOT seeded here.
--
-- This file used to INSERT a super_admin with a bcrypt hash of the publicly
-- known, hardcoded password. Anyone who applied this migration got a
-- working admin login whose credentials are in the repository.
--
-- The first admin is now created explicitly from the environment:
--   ADMIN_BOOTSTRAP_EMAIL=... ADMIN_BOOTSTRAP_PASSWORD=... ./backend seed
-- (see internal/seeder/seeder.go — it never modifies an existing admin).

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE admin_users IS 'Administrative users with access to the admin portal';
COMMENT ON TABLE admin_sessions IS 'Active admin authentication sessions';
COMMENT ON TABLE admin_audit_logs IS 'Comprehensive audit trail of all admin actions';
COMMENT ON TABLE admin_roles IS 'Predefined admin roles with specific permissions';
COMMENT ON TABLE admin_notifications IS 'System notifications for admin users';

COMMENT ON COLUMN admin_users.role IS 'Admin role: super_admin, admin, operations, support, financial';
COMMENT ON COLUMN admin_users.permissions IS 'JSON object defining specific permissions for this user';
COMMENT ON COLUMN admin_users.mfa_secret IS 'Base32 encoded secret for TOTP-based MFA';
COMMENT ON COLUMN admin_sessions.token_hash IS 'SHA-256 hash of the JWT token for session validation';
COMMENT ON COLUMN admin_audit_logs.action IS 'Specific action performed (e.g., user_suspended, order_refunded)';
COMMENT ON COLUMN admin_audit_logs.resource_type IS 'Type of resource affected (user, business, order, etc.)';
COMMENT ON COLUMN admin_audit_logs.details IS 'Additional context and metadata about the action';