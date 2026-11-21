-- ============================================================================
-- CivicFix - AI-Powered Civic Problem Reporting & Management Platform
-- Database Schema for MySQL 8 (InnoDB)
-- ============================================================================

-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS civicfix_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE civicfix_db;

-- ============================================================================
-- DROP EXISTING TABLES (Reverse Dependency Order)
-- ============================================================================
DROP VIEW IF EXISTS v_road_health_metrics;
DROP VIEW IF EXISTS v_repair_company_performance;
DROP VIEW IF EXISTS v_recurring_problems_by_locality;
DROP VIEW IF EXISTS v_unresolved_issues;

DROP TABLE IF EXISTS issue_status_updates;
DROP TABLE IF EXISTS issue_assignments;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS repair_companies;

-- ============================================================================
-- TABLE 1: repair_companies
-- Stores registered repair contractors and civic maintenance entities.
-- ============================================================================
CREATE TABLE repair_companies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    locality VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT uq_repair_companies_email UNIQUE (email),

    -- Indexes
    INDEX idx_repair_companies_locality (locality)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Stores registered repair companies and service vendors';

-- ============================================================================
-- TABLE 2: issues
-- Stores unique physical civic problems verified by AI/Admin.
-- Multiple citizen reports can link to a single physical issue.
-- ============================================================================
CREATE TABLE issues (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    locality VARCHAR(150) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'moderate',
    priority_score INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'reported',
    report_count INT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,

    -- Domain Constraints
    CONSTRAINT chk_issues_category CHECK (
        category IN (
            'pothole',
            'waterlogging',
            'garbage_accumulation',
            'broken_streetlight',
            'drainage_problem',
            'damaged_road',
            'other'
        )
    ),
    CONSTRAINT chk_issues_severity CHECK (
        severity IN ('low', 'moderate', 'high', 'critical')
    ),
    CONSTRAINT chk_issues_status CHECK (
        status IN ('reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected')
    ),
    CONSTRAINT chk_issues_priority_score CHECK (priority_score >= 0),
    CONSTRAINT chk_issues_report_count CHECK (report_count >= 1),
    CONSTRAINT chk_issues_latitude CHECK (latitude BETWEEN -90.00000000 AND 90.00000000),
    CONSTRAINT chk_issues_longitude CHECK (longitude BETWEEN -180.00000000 AND 180.00000000),

    -- Indexes
    INDEX idx_issues_status (status),
    INDEX idx_issues_category (category),
    INDEX idx_issues_locality (locality),
    INDEX idx_issues_severity (severity),
    INDEX idx_issues_priority_score (priority_score DESC),
    INDEX idx_issues_coordinates (latitude, longitude),
    INDEX idx_issues_category_locality (category, locality),
    INDEX idx_issues_status_created_at (status, created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Unique physical civic issues identified and aggregated by AI';

-- ============================================================================
-- TABLE 3: reports
-- Stores individual reports submitted by citizens with images and GPS data.
-- ============================================================================
CREATE TABLE reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reporter_id CHAR(36) NOT NULL, -- UUID format referencing future auth system
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    locality VARCHAR(150) NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    issue_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Domain Constraints
    CONSTRAINT chk_reports_category CHECK (
        category IN (
            'pothole',
            'waterlogging',
            'garbage_accumulation',
            'broken_streetlight',
            'drainage_problem',
            'damaged_road',
            'other'
        )
    ),
    CONSTRAINT chk_reports_verification_status CHECK (
        verification_status IN ('pending', 'verified', 'rejected')
    ),
    CONSTRAINT chk_reports_latitude CHECK (latitude BETWEEN -90.00000000 AND 90.00000000),
    CONSTRAINT chk_reports_longitude CHECK (longitude BETWEEN -180.00000000 AND 180.00000000),

    -- Foreign Key Constraint
    CONSTRAINT fk_reports_issue FOREIGN KEY (issue_id)
        REFERENCES issues (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Indexes
    INDEX idx_reports_reporter_id (reporter_id),
    INDEX idx_reports_issue_id (issue_id),
    INDEX idx_reports_verification_status (verification_status),
    INDEX idx_reports_category (category),
    INDEX idx_reports_locality (locality),
    INDEX idx_reports_coordinates (latitude, longitude),
    INDEX idx_reports_created_at (created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Raw citizen submissions with geolocation and evidence photos';

-- ============================================================================
-- TABLE 4: issue_assignments
-- Manages assignment of verified civic issues to registered repair companies.
-- Supports multi-stage assignments, re-assignments, and historical auditing.
-- ============================================================================
CREATE TABLE issue_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    issue_id BIGINT UNSIGNED NOT NULL,
    company_id BIGINT UNSIGNED NOT NULL,
    assigned_by VARCHAR(100) NOT NULL, -- Admin username, user UUID, or system identifier
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'assigned',
    remarks TEXT NULL,

    -- Domain Constraints
    CONSTRAINT chk_assignments_status CHECK (
        status IN ('assigned', 'accepted', 'in_progress', 'completed', 'reassigned', 'cancelled')
    ),

    -- Foreign Key Constraints
    CONSTRAINT fk_assignments_issue FOREIGN KEY (issue_id)
        REFERENCES issues (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_company FOREIGN KEY (company_id)
        REFERENCES repair_companies (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Indexes
    INDEX idx_assignments_issue_id (issue_id),
    INDEX idx_assignments_company_id (company_id),
    INDEX idx_assignments_company_status (company_id, status),
    INDEX idx_assignments_assigned_at (assigned_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Work orders mapping civic issues to contracted repair companies';

-- ============================================================================
-- TABLE 5: issue_status_updates
-- Append-only audit log maintaining the complete history of every status transition.
-- Old records must NEVER be updated or overwritten.
-- ============================================================================
CREATE TABLE issue_status_updates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    issue_id BIGINT UNSIGNED NOT NULL,
    company_id BIGINT UNSIGNED NULL, -- NULL if updated by admin/system, non-null if updated by company
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    remarks TEXT NULL,
    image_url VARCHAR(2048) NULL, -- Before/during/after repair photographic proof
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Domain Constraints
    CONSTRAINT chk_status_updates_old_status CHECK (
        old_status IN ('reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected')
    ),
    CONSTRAINT chk_status_updates_new_status CHECK (
        new_status IN ('reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected')
    ),

    -- Foreign Key Constraints
    CONSTRAINT fk_status_updates_issue FOREIGN KEY (issue_id)
        REFERENCES issues (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_status_updates_company FOREIGN KEY (company_id)
        REFERENCES repair_companies (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Indexes
    INDEX idx_status_updates_issue_id (issue_id),
    INDEX idx_status_updates_company_id (company_id),
    INDEX idx_status_updates_issue_created (issue_id, created_at),
    INDEX idx_status_updates_created_at (created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Immutable append-only lifecycle event log for civic issues';

-- ============================================================================
-- ANALYTICAL VIEWS FOR CIVIC MANAGEMENT & HISTORICAL ANALYSIS
-- ============================================================================

-- 1. View: Active Unresolved Issues (For Admin / Dispatch Dashboard)
CREATE OR REPLACE VIEW v_unresolved_issues AS
SELECT 
    i.id AS issue_id,
    i.category,
    i.description,
    i.locality,
    i.latitude,
    i.longitude,
    i.severity,
    i.priority_score,
    i.status,
    i.report_count,
    i.created_at,
    TIMESTAMPDIFF(HOUR, i.created_at, CURRENT_TIMESTAMP) AS age_in_hours,
    TIMESTAMPDIFF(DAY, i.created_at, CURRENT_TIMESTAMP) AS age_in_days,
    rc.id AS assigned_company_id,
    rc.company_name AS assigned_company_name
FROM issues i
LEFT JOIN (
    SELECT ia1.issue_id, ia1.company_id
    FROM issue_assignments ia1
    INNER JOIN (
        SELECT issue_id, MAX(assigned_at) AS max_assigned_at
        FROM issue_assignments
        WHERE status NOT IN ('cancelled', 'reassigned')
        GROUP BY issue_id
    ) ia2 ON ia1.issue_id = ia2.issue_id AND ia1.assigned_at = ia2.max_assigned_at
) latest_assign ON i.id = latest_assign.issue_id
LEFT JOIN repair_companies rc ON latest_assign.company_id = rc.id
WHERE i.status NOT IN ('resolved', 'rejected');

-- 2. View: Recurring Problems by Locality (For Infrastructure Planning)
CREATE OR REPLACE VIEW v_recurring_problems_by_locality AS
SELECT 
    locality,
    category,
    COUNT(id) AS total_distinct_issues,
    SUM(report_count) AS total_citizen_complaints,
    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) AS critical_issues_count,
    SUM(CASE WHEN status NOT IN ('resolved', 'rejected') THEN 1 ELSE 0 END) AS pending_issues_count,
    ROUND(AVG(priority_score), 1) AS avg_priority_score
FROM issues
GROUP BY locality, category;

-- 3. View: Repair Company Performance & SLA Compliance
CREATE OR REPLACE VIEW v_repair_company_performance AS
SELECT 
    rc.id AS company_id,
    rc.company_name,
    rc.locality AS operating_locality,
    COUNT(DISTINCT ia.id) AS total_assignments_received,
    COUNT(DISTINCT CASE WHEN ia.status = 'completed' THEN ia.id END) AS completed_assignments,
    COUNT(DISTINCT CASE WHEN ia.status IN ('assigned', 'accepted', 'in_progress') THEN ia.id END) AS active_assignments,
    ROUND(AVG(
        CASE 
            WHEN i.resolved_at IS NOT NULL AND i.created_at IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, i.created_at, i.resolved_at) / 60.0
            ELSE NULL 
        END
    ), 2) AS avg_resolution_time_hours,
    ROUND(
        (COUNT(DISTINCT CASE WHEN ia.status = 'completed' THEN ia.id END) * 100.0) / 
        NULLIF(COUNT(DISTINCT ia.id), 0),
        2
    ) AS completion_rate_percentage
FROM repair_companies rc
LEFT JOIN issue_assignments ia ON rc.id = ia.company_id
LEFT JOIN issues i ON ia.issue_id = i.id
GROUP BY rc.id, rc.company_name, rc.locality;

-- 4. View: Road Health & Infrastructure Metrics by Locality
CREATE OR REPLACE VIEW v_road_health_metrics AS
SELECT 
    locality,
    COUNT(id) AS total_issues_logged,
    SUM(CASE WHEN category IN ('pothole', 'damaged_road') THEN 1 ELSE 0 END) AS road_damage_issues,
    SUM(CASE WHEN category = 'waterlogging' THEN 1 ELSE 0 END) AS waterlogging_issues,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_issues,
    SUM(CASE WHEN status NOT IN ('resolved', 'rejected') THEN 1 ELSE 0 END) AS active_issues,
    -- Road Health Score (out of 100): High score = healthy infrastructure; drops with unresolved damage and high critical severity
    GREATEST(0, LEAST(100, ROUND(
        100 
        - (SUM(CASE WHEN category IN ('pothole', 'damaged_road') AND status != 'resolved' THEN 15 ELSE 0 END))
        - (SUM(CASE WHEN category = 'waterlogging' AND status != 'resolved' THEN 10 ELSE 0 END))
        - (SUM(CASE WHEN severity = 'critical' AND status != 'resolved' THEN 20 ELSE 0 END)),
        1
    ))) AS calculated_road_health_score
FROM issues
GROUP BY locality;
