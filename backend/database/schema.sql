-- ============================================================================
-- CivicFix — MySQL 8 schema (the ONLY database; replaces the former MongoDB collections)
-- Idempotent: every statement is IF NOT EXISTS / CREATE OR REPLACE, so `npm run db:init`
-- (and server start-up) can run it repeatedly.  Conventions:
--   * BIGINT UNSIGNED AUTO_INCREMENT ids (exposed by the API as strings in `_id`)
--   * DATETIME(3) columns store UTC
--   * Mongo embedded arrays are child tables with foreign keys
-- Keep one statement per block and no semicolons inside comments or strings.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('citizen', 'admin', 'contractor') NOT NULL DEFAULT 'citizen',
    language ENUM('en', 'pa', 'hi') NOT NULL DEFAULT 'en',
    phone VARCHAR(30) NULL,
    fcm_token VARCHAR(512) NULL,
    avatar VARCHAR(2048) NULL,
    civic_creds INT NOT NULL DEFAULT 50,
    civic_score INT NOT NULL DEFAULT 100,
    citizen_tier ENUM('Bronze Citizen', 'Silver Guardian', 'Gold Civic Champion', 'Platinum City Hero') NOT NULL DEFAULT 'Bronze Citizen',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role_active (role, is_active),
    KEY idx_users_leaderboard (role, is_active, civic_creds)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_badges (
    user_id BIGINT UNSIGNED NOT NULL,
    badge VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, badge),
    CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creds_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(100) NOT NULL,
    amount INT NOT NULL,
    details VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_creds_history_user (user_id, created_at),
    CONSTRAINT fk_creds_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    original_language ENUM('en', 'pa', 'hi') NOT NULL DEFAULT 'en',
    translated_description TEXT NULL,
    category ENUM('pothole', 'streetlight', 'garbage', 'drainage', 'waterlogging', 'road_damage', 'other') NOT NULL,
    status ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    address VARCHAR(500) NULL,
    submitted_by BIGINT UNSIGNED NULL,
    ai_severity VARCHAR(20) NULL,
    ai_category VARCHAR(50) NULL,
    ai_confidence DOUBLE NULL,
    ai_outcome VARCHAR(50) NULL,
    ai_manual_review TINYINT(1) NOT NULL DEFAULT 0,
    ai_relevance_status VARCHAR(30) NULL,
    ai_method VARCHAR(80) NULL,
    ai_message TEXT NULL,
    ai_image_hash VARCHAR(64) NULL,
    ai_analyzed_at DATETIME(3) NULL,
    ai_is_duplicate TINYINT(1) NOT NULL DEFAULT 0,
    ai_duplicate_of BIGINT UNSIGNED NULL,
    confirmation_count INT NOT NULL DEFAULT 0,
    priority_score INT NOT NULL DEFAULT 10,
    reward_pending TINYINT(1) NOT NULL DEFAULT 0,
    reward_granted TINYINT(1) NOT NULL DEFAULT 0,
    is_verified_by_community TINYINT(1) NOT NULL DEFAULT 0,
    priority_zone VARCHAR(20) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    KEY idx_reports_geo (latitude, longitude),
    KEY idx_reports_status_category_priority (status, category, priority),
    KEY idx_reports_submitted_by (submitted_by),
    KEY idx_reports_image_hash (ai_image_hash),
    KEY idx_reports_created_at (created_at),
    CONSTRAINT fk_reports_user FOREIGN KEY (submitted_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_duplicate_of FOREIGN KEY (ai_duplicate_of) REFERENCES reports (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    url VARCHAR(2048) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_report_images_report (report_id, sort_order),
    CONSTRAINT fk_report_images_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_upvotes (
    report_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (report_id, user_id),
    CONSTRAINT fk_report_upvotes_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_report_upvotes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_confirmations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    confirmed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    remarks VARCHAR(500) NOT NULL DEFAULT 'Confirmed genuine active civic issue.',
    UNIQUE KEY uq_report_confirmations (report_id, user_id),
    CONSTRAINT fk_report_confirmations_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_report_confirmations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by BIGINT UNSIGNED NULL,
    remarks VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_report_status_history_report (report_id, created_at),
    CONSTRAINT fk_report_status_history_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT UNSIGNED NOT NULL,
    assigned_contractor BIGINT UNSIGNED NULL,
    status ENUM('open', 'in_progress', 'completed', 'verified') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    scheduled_date DATETIME(3) NULL,
    completed_date DATETIME(3) NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    KEY idx_work_orders_contractor_status (assigned_contractor, status),
    KEY idx_work_orders_report (report_id),
    CONSTRAINT fk_work_orders_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_work_orders_contractor FOREIGN KEY (assigned_contractor) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_work_orders_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_order_evidence (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    work_order_id BIGINT UNSIGNED NOT NULL,
    url VARCHAR(2048) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_work_order_evidence_wo (work_order_id, sort_order),
    CONSTRAINT fk_work_order_evidence_wo FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_moderation (
    report_id BIGINT UNSIGNED PRIMARY KEY,
    verdict ENUM('valid', 'fake') NOT NULL,
    reason VARCHAR(500) NULL,
    moderated_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_report_moderation_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_report_moderation_by FOREIGN KEY (moderated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_activity (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT UNSIGNED NULL,
    action VARCHAR(60) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    details VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_admin_activity_created (created_at),
    CONSTRAINT fk_admin_activity_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT UNSIGNED NOT NULL,
    type ENUM('report_update', 'work_order', 'civic_alert', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    related_report_id BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    KEY idx_notifications_recipient (recipient_id, is_read, created_at),
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_report FOREIGN KEY (related_report_id) REFERENCES reports (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS road_segments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    health_score INT NOT NULL DEFAULT 100,
    last_inspected DATETIME(3) NULL,
    report_count INT NOT NULL DEFAULT 0,
    dominant_issue VARCHAR(100) NULL,
    status ENUM('good', 'fair', 'poor', 'critical') NOT NULL DEFAULT 'good',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_road_segments_name (name),
    KEY idx_road_segments_health (health_score)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS road_segment_points (
    segment_id BIGINT UNSIGNED NOT NULL,
    seq INT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    PRIMARY KEY (segment_id, seq),
    CONSTRAINT fk_road_segment_points_segment FOREIGN KEY (segment_id) REFERENCES road_segments (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT UNSIGNED NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    original_text TEXT NOT NULL,
    original_language ENUM('en', 'pa', 'hi') NOT NULL,
    text_en TEXT NULL,
    text_pa TEXT NULL,
    text_hi TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    KEY idx_translations_entity (entity_id, entity_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- Reporting views (ported from the original database teammate's analytics views)
-- The "locality" of a report is its address text.
-- ============================================================================

CREATE OR REPLACE VIEW v_unresolved_issues AS
SELECT
    r.id AS issue_id,
    r.category,
    r.description,
    COALESCE(NULLIF(r.address, ''), 'Unknown') AS locality,
    r.latitude,
    r.longitude,
    r.priority AS severity,
    r.priority_score,
    r.status,
    r.confirmation_count AS report_count,
    r.created_at,
    TIMESTAMPDIFF(HOUR, r.created_at, UTC_TIMESTAMP()) AS age_in_hours,
    TIMESTAMPDIFF(DAY, r.created_at, UTC_TIMESTAMP()) AS age_in_days,
    wo.assigned_contractor AS assigned_company_id,
    u.name AS assigned_company_name
FROM reports r
LEFT JOIN work_orders wo ON wo.id = (SELECT MAX(w2.id) FROM work_orders w2 WHERE w2.report_id = r.id)
LEFT JOIN users u ON u.id = wo.assigned_contractor
WHERE r.status NOT IN ('resolved', 'closed');

CREATE OR REPLACE VIEW v_recurring_problems_by_locality AS
SELECT
    COALESCE(NULLIF(address, ''), 'Unknown') AS locality,
    category,
    COUNT(id) AS total_distinct_issues,
    SUM(confirmation_count) AS total_citizen_complaints,
    SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) AS critical_issues_count,
    SUM(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS pending_issues_count,
    ROUND(AVG(priority_score), 1) AS avg_priority_score
FROM reports
GROUP BY COALESCE(NULLIF(address, ''), 'Unknown'), category;

CREATE OR REPLACE VIEW v_repair_company_performance AS
SELECT
    u.id AS company_id,
    u.name AS company_name,
    u.email AS operating_locality,
    COUNT(wo.id) AS total_assignments_received,
    SUM(CASE WHEN wo.status IN ('completed', 'verified') THEN 1 ELSE 0 END) AS completed_assignments,
    SUM(CASE WHEN wo.status IN ('open', 'in_progress') THEN 1 ELSE 0 END) AS active_assignments,
    ROUND(AVG(CASE WHEN wo.completed_date IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, wo.created_at, wo.completed_date) / 60.0 ELSE NULL END), 2) AS avg_resolution_time_hours,
    ROUND((SUM(CASE WHEN wo.status IN ('completed', 'verified') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(wo.id), 0), 2) AS completion_rate_percentage
FROM users u
LEFT JOIN work_orders wo ON wo.assigned_contractor = u.id
WHERE u.role = 'contractor'
GROUP BY u.id, u.name, u.email;

CREATE OR REPLACE VIEW v_road_health_metrics AS
SELECT
    COALESCE(NULLIF(address, ''), 'Unknown') AS locality,
    COUNT(id) AS total_issues_logged,
    SUM(CASE WHEN category IN ('pothole', 'road_damage') THEN 1 ELSE 0 END) AS road_damage_issues,
    SUM(CASE WHEN category IN ('waterlogging', 'drainage') THEN 1 ELSE 0 END) AS waterlogging_issues,
    SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved_issues,
    SUM(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS active_issues,
    GREATEST(0, LEAST(100, ROUND(
        100
        - SUM(CASE WHEN category IN ('pothole', 'road_damage') AND status NOT IN ('resolved', 'closed') THEN 15 ELSE 0 END)
        - SUM(CASE WHEN category IN ('waterlogging', 'drainage') AND status NOT IN ('resolved', 'closed') THEN 10 ELSE 0 END)
        - SUM(CASE WHEN priority = 'critical' AND status NOT IN ('resolved', 'closed') THEN 20 ELSE 0 END),
        1
    ))) AS calculated_road_health_score
FROM reports
GROUP BY COALESCE(NULLIF(address, ''), 'Unknown');
