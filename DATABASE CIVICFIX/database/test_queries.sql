-- ============================================================================
-- CivicFix - Test Queries & Workflow Demonstrations
-- Database: civicfix_db (MySQL 8)
-- ============================================================================

USE civicfix_db;

-- ============================================================================
-- SEED DATA SETUP: Clean slate and sample data for realistic verification
-- ============================================================================

-- Disable foreign key checks temporarily for clean reseeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE issue_status_updates;
TRUNCATE TABLE issue_assignments;
TRUNCATE TABLE reports;
TRUNCATE TABLE issues;
TRUNCATE TABLE repair_companies;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- QUERY 1: Inserting a citizen report
-- Citizen captures a severe pothole via mobile app with GPS and uploaded photo.
-- ============================================================================
INSERT INTO reports (
    reporter_id,
    category,
    description,
    image_url,
    latitude,
    longitude,
    locality,
    verification_status
) VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'pothole',
    'Large, deep pothole in the middle of 5th Main Road near City Metro Station. Causing traffic slowdowns and bike skidding.',
    'https://storage.civicfix.org/uploads/reports/2026/11/pothole_metro_5th_main.jpg',
    12.97159870,
    77.59456270,
    'Indiranagar',
    'pending'
);

-- Store generated report ID for subsequent operations
SET @first_report_id = LAST_INSERT_ID();
SELECT CONCAT('Successfully inserted citizen report with ID: ', @first_report_id) AS query_1_result;

-- ============================================================================
-- QUERY 2: Creating a new civic issue
-- AI or Admin verifies the report, clusters coordinates, and creates unique issue.
-- ============================================================================
INSERT INTO issues (
    category,
    description,
    latitude,
    longitude,
    locality,
    severity,
    priority_score,
    status,
    report_count,
    created_at
) VALUES (
    'pothole',
    'Deep hazardous pothole on 5th Main Road, Indiranagar near Metro Station pillar 42.',
    12.97159870,
    77.59456270,
    'Indiranagar',
    'critical',
    85,
    'verified',
    1,
    NOW() - INTERVAL 2 DAY
);

SET @new_issue_id = LAST_INSERT_ID();
SELECT CONCAT('Successfully created civic issue with ID: ', @new_issue_id) AS query_2_result;

-- Log initial status transition in audit log
INSERT INTO issue_status_updates (
    issue_id,
    company_id,
    old_status,
    new_status,
    remarks,
    created_at
) VALUES (
    @new_issue_id,
    NULL,
    'reported',
    'verified',
    'AI vision validated image integrity and GPS match; classified as critical severity.',
    NOW() - INTERVAL 2 DAY
);

-- ============================================================================
-- QUERY 3: Linking multiple reports to one issue
-- Multiple citizens report the same physical problem at similar GPS coordinates.
-- AI deduplication links both the original and newly arrived reports to the issue.
-- ============================================================================

-- First, link the original report to the new issue
UPDATE reports 
SET issue_id = @new_issue_id,
    verification_status = 'verified'
WHERE id = @first_report_id;

-- Second citizen reports the exact same physical pothole
INSERT INTO reports (
    reporter_id,
    category,
    description,
    image_url,
    latitude,
    longitude,
    locality,
    verification_status,
    issue_id
) VALUES (
    'f9e8d7c6-b5a4-3210-fedc-ba9876543210',
    'pothole',
    'Dangerous road crater near metro entrance, saw a scooter fall yesterday!',
    'https://storage.civicfix.org/uploads/reports/2026/11/pothole_metro_view2.jpg',
    12.97161000,
    77.59458000,
    'Indiranagar',
    'verified',
    @new_issue_id
);

-- Third citizen also reports the same issue
INSERT INTO reports (
    reporter_id,
    category,
    description,
    image_url,
    latitude,
    longitude,
    locality,
    verification_status,
    issue_id
) VALUES (
    '11223344-5566-7788-99aa-bbccddeeff00',
    'pothole',
    'Bad road break right under metro pillar 42 Indiranagar.',
    'https://storage.civicfix.org/uploads/reports/2026/11/pothole_metro_view3.jpg',
    12.97159500,
    77.59456000,
    'Indiranagar',
    'verified',
    @new_issue_id
);

-- Verify all reports linked to this issue
SELECT 
    r.id AS report_id,
    r.reporter_id,
    r.category,
    r.locality,
    r.latitude,
    r.longitude,
    r.verification_status,
    r.issue_id,
    r.created_at
FROM reports r
WHERE r.issue_id = @new_issue_id;

-- ============================================================================
-- QUERY 4: Updating report_count
-- Synchronize the issue's report_count and elevate priority score dynamically.
-- ============================================================================
UPDATE issues i
SET 
    i.report_count = (
        SELECT COUNT(*) 
        FROM reports r 
        WHERE r.issue_id = i.id
    ),
    -- Dynamically recalculate priority score based on severity weight and report volume
    i.priority_score = LEAST(100, i.priority_score + (
        (SELECT COUNT(*) FROM reports r WHERE r.issue_id = i.id) * 5
    )),
    i.updated_at = NOW()
WHERE i.id = @new_issue_id;

-- Display updated issue stats
SELECT 
    id AS issue_id,
    category,
    locality,
    severity,
    priority_score,
    report_count,
    status
FROM issues
WHERE id = @new_issue_id;

-- ============================================================================
-- QUERY 5: Registering repair companies
-- Onboard municipal contractors and public works maintenance firms.
-- ============================================================================
INSERT INTO repair_companies (company_name, email, phone, locality)
VALUES 
    ('Metro Roads & Asphalt Infra Pvt Ltd', 'contact@metroroads.com', '+91-9880011223', 'Indiranagar'),
    ('Apex Drainage & Civil Works', 'ops@apexdrainage.in', '+91-9880044556', 'Koramangala'),
    ('CleanCity Sanitation Services', 'helpdesk@cleancityservices.com', '+91-9880077889', 'Whitefield');

SET @road_company_id = (SELECT id FROM repair_companies WHERE email = 'contact@metroroads.com');
SET @drain_company_id = (SELECT id FROM repair_companies WHERE email = 'ops@apexdrainage.in');

SELECT id, company_name, email, phone, locality FROM repair_companies;

-- ============================================================================
-- QUERY 6: Assigning an issue to a company
-- Municipal admin dispatches the verified pothole issue to the asphalt company.
-- Uses an atomic transaction to ensure assignment and issue status stay synchronized.
-- ============================================================================
START TRANSACTION;

-- Step 1: Create assignment record
INSERT INTO issue_assignments (
    issue_id,
    company_id,
    assigned_by,
    assigned_at,
    status,
    remarks
) VALUES (
    @new_issue_id,
    @road_company_id,
    'admin_user_blr_east',
    NOW() - INTERVAL 1 DAY,
    'assigned',
    'Urgent road patch repair required within 24 hours. High traffic metro corridor.'
);

-- Step 2: Update status on issues table
UPDATE issues 
SET status = 'assigned',
    updated_at = NOW() - INTERVAL 1 DAY
WHERE id = @new_issue_id;

-- Step 3: Record status transition in immutable audit table
INSERT INTO issue_status_updates (
    issue_id,
    company_id,
    old_status,
    new_status,
    remarks,
    created_at
) VALUES (
    @new_issue_id,
    @road_company_id,
    'verified',
    'assigned',
    'Work order issued to Metro Roads & Asphalt Infra Pvt Ltd.',
    NOW() - INTERVAL 1 DAY
);

COMMIT;

-- Verify assignment
SELECT 
    ia.id AS assignment_id,
    ia.issue_id,
    rc.company_name,
    ia.assigned_by,
    ia.assigned_at,
    ia.status AS assignment_status,
    i.status AS current_issue_status
FROM issue_assignments ia
JOIN repair_companies rc ON ia.company_id = rc.id
JOIN issues i ON ia.issue_id = i.id
WHERE ia.issue_id = @new_issue_id;

-- ============================================================================
-- QUERY 7 & QUERY 8: Repair Company Status Updates & Audit Logging
-- Demonstrating the lifecycle: assigned -> in_progress -> resolved
-- ============================================================================

-- Step 7A: Company begins work on site -> status updated to 'in_progress'
START TRANSACTION;

UPDATE issue_assignments
SET status = 'in_progress'
WHERE issue_id = @new_issue_id AND company_id = @road_company_id;

UPDATE issues
SET status = 'in_progress',
    updated_at = NOW() - INTERVAL 12 HOUR
WHERE id = @new_issue_id;

-- Query 8A: Record transition to 'in_progress' in immutable audit log
INSERT INTO issue_status_updates (
    issue_id,
    company_id,
    old_status,
    new_status,
    remarks,
    image_url,
    created_at
) VALUES (
    @new_issue_id,
    @road_company_id,
    'assigned',
    'in_progress',
    'Work crew deployed on site with asphalt roller and cold mix bitumen.',
    'https://storage.civicfix.org/uploads/progress/2026/11/crew_on_site_pothole_42.jpg',
    NOW() - INTERVAL 12 HOUR
);

COMMIT;

-- Step 7B: Company finishes repair -> status updated to 'resolved'
START TRANSACTION;

UPDATE issue_assignments
SET status = 'completed'
WHERE issue_id = @new_issue_id AND company_id = @road_company_id;

UPDATE issues
SET status = 'resolved',
    resolved_at = NOW() - INTERVAL 2 HOUR,
    updated_at = NOW() - INTERVAL 2 HOUR
WHERE id = @new_issue_id;

-- Query 8B: Record resolution in immutable audit log with after-repair photograph
INSERT INTO issue_status_updates (
    issue_id,
    company_id,
    old_status,
    new_status,
    remarks,
    image_url,
    created_at
) VALUES (
    @new_issue_id,
    @road_company_id,
    'in_progress',
    'resolved',
    'Pothole filled with heavy duty mastic asphalt, leveled and traffic reopened.',
    'https://storage.civicfix.org/uploads/resolution/2026/11/pothole_resolved_proof_42.jpg',
    NOW() - INTERVAL 2 HOUR
);

COMMIT;

-- Verify updated issue state
SELECT 
    id, category, locality, severity, status, report_count, created_at, resolved_at
FROM issues
WHERE id = @new_issue_id;

-- ============================================================================
-- SEED ADDITIONAL DATA: Recurring waterlogging & various issues across localities
-- ============================================================================
INSERT INTO issues (
    category, description, latitude, longitude, locality, severity, priority_score, status, report_count, created_at, resolved_at
) VALUES
    ('waterlogging', 'Severe waterlogging at Sony World Junction after rain', 12.93510000, 77.62440000, 'Koramangala', 'critical', 95, 'in_progress', 6, NOW() - INTERVAL 5 DAY, NULL),
    ('waterlogging', 'Stormwater backflow causing waterlogging on 80 Feet Road', 12.93820000, 77.62890000, 'Koramangala', 'high', 80, 'assigned', 4, NOW() - INTERVAL 4 DAY, NULL),
    ('waterlogging', 'Recurrent water stagnation near 4th Block Park', 12.93150000, 77.62120000, 'Koramangala', 'moderate', 60, 'resolved', 3, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 8 DAY),
    ('waterlogging', 'Flooding near railway underpass during storms', 12.99810000, 77.66900000, 'Whitefield', 'high', 75, 'reported', 2, NOW() - INTERVAL 3 DAY, NULL),
    ('drainage_problem', 'Choked underground drain causing foul overflow', 12.93480000, 77.62550000, 'Koramangala', 'high', 78, 'in_progress', 5, NOW() - INTERVAL 6 DAY, NULL),
    ('broken_streetlight', 'Entire row of 6 streetlights non-functional on 100 Feet Rd', 12.97850000, 77.64080000, 'Indiranagar', 'moderate', 50, 'resolved', 2, NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 5 DAY);

-- Assign waterlogging and drainage issues to Apex Drainage
INSERT INTO issue_assignments (issue_id, company_id, assigned_by, assigned_at, status, remarks)
SELECT id, @drain_company_id, 'system_dispatcher', NOW() - INTERVAL 3 DAY, 'in_progress', 'Monsoon preparedness priority'
FROM issues 
WHERE locality = 'Koramangala' AND status = 'in_progress';

-- ============================================================================
-- QUERY 9: Retrieving all issues assigned to a particular company
-- Used by the repair company portal to display their work queue.
-- ============================================================================
SELECT 
    rc.company_name,
    i.id AS issue_id,
    i.category,
    i.description,
    i.locality,
    i.severity,
    i.priority_score,
    i.status AS issue_status,
    ia.status AS assignment_status,
    ia.assigned_at,
    ia.remarks AS assignment_instructions
FROM issue_assignments ia
JOIN repair_companies rc ON ia.company_id = rc.id
JOIN issues i ON ia.issue_id = i.id
WHERE ia.company_id = @drain_company_id
  AND ia.status IN ('assigned', 'accepted', 'in_progress')
ORDER BY i.priority_score DESC, ia.assigned_at ASC;

-- ============================================================================
-- QUERY 10: Finding recurring waterlogging problems in a locality
-- Identifies problem hotspots for urban planners and monsoon disaster mitigation.
-- ============================================================================
SELECT 
    locality,
    category,
    COUNT(id) AS total_waterlogging_incidents,
    SUM(report_count) AS total_citizen_complaints,
    SUM(CASE WHEN status IN ('reported', 'verified', 'assigned', 'in_progress') THEN 1 ELSE 0 END) AS unresolved_incidents,
    SUM(CASE WHEN severity IN ('high', 'critical') THEN 1 ELSE 0 END) AS severe_incidents,
    ROUND(AVG(latitude), 6) AS centroid_latitude,
    ROUND(AVG(longitude), 6) AS centroid_longitude
FROM issues
WHERE category = 'waterlogging'
GROUP BY locality, category
HAVING COUNT(id) >= 1
ORDER BY total_waterlogging_incidents DESC, total_citizen_complaints DESC;

-- ============================================================================
-- QUERY 11: Calculating the average resolution time
-- Measures municipal efficiency and contractor turnaround across categories.
-- ============================================================================
SELECT 
    category,
    COUNT(id) AS total_resolved_issues,
    ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at) / 60.0), 2) AS avg_resolution_hours,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at) / 24.0), 2) AS avg_resolution_days,
    MIN(TIMESTAMPDIFF(MINUTE, created_at, resolved_at) / 60.0) AS fastest_resolution_hours,
    MAX(TIMESTAMPDIFF(MINUTE, created_at, resolved_at) / 60.0) AS slowest_resolution_hours
FROM issues
WHERE status = 'resolved' 
  AND resolved_at IS NOT NULL
GROUP BY category;

-- ============================================================================
-- QUERY 12: Retrieving the complete history of an issue
-- Audit trail from initial citizen report to resolution verification.
-- ============================================================================
SELECT 
    isu.id AS log_id,
    isu.issue_id,
    isu.old_status,
    isu.new_status,
    isu.remarks,
    isu.image_url,
    isu.created_at AS transition_timestamp,
    COALESCE(rc.company_name, 'Municipal System / Admin') AS triggered_by
FROM issue_status_updates isu
LEFT JOIN repair_companies rc ON isu.company_id = rc.id
WHERE isu.issue_id = @new_issue_id
ORDER BY isu.created_at ASC, isu.id ASC;

-- ============================================================================
-- BONUS ANALYTICAL QUERIES (Demonstrating Views & Road Health Scores)
-- ============================================================================

-- A. Active Unresolved Issues across all zones
SELECT * FROM v_unresolved_issues ORDER BY priority_score DESC;

-- B. Repair Company SLA & Performance Metrics
SELECT * FROM v_repair_company_performance;

-- C. Road Health Score Calculation across Localities
SELECT 
    locality,
    total_issues_logged,
    road_damage_issues,
    waterlogging_issues,
    resolved_issues,
    active_issues,
    calculated_road_health_score,
    CASE 
        WHEN calculated_road_health_score >= 80 THEN 'Excellent / Well Maintained'
        WHEN calculated_road_health_score >= 50 THEN 'Fair / Moderate Wear'
        ELSE 'Critical / Needs Immediate Intervention'
    END AS infrastructure_grade
FROM v_road_health_metrics
ORDER BY calculated_road_health_score ASC;
