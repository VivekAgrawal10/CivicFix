-- ============================================================================
-- CivicFix — reference / smoke-test queries for the MySQL schema (database/schema.sql)
-- Run them in the mysql client after `npm run db:init && npm run seed`, e.g.
--     mysql -u root -p civicfix_db < database/test_queries.sql
-- (queries 1-3 and 7 insert or change rows; the others only read).
-- ============================================================================

-- 1. Citizen files a report (status history entry written alongside)
INSERT INTO reports (title, description, category, status, priority, latitude, longitude, address, submitted_by)
SELECT 'Pothole near bus stand', 'Deep pothole causing accidents', 'pothole', 'pending', 'high', 30.7333000, 76.7794000, 'Sector 17, Chandigarh', id
FROM users WHERE email = 'citizen@civicfix.com';
INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, remarks)
VALUES (LAST_INSERT_ID(), NULL, 'pending', NULL, 'Report created');

-- 2. Attach image metadata to the newest report
INSERT INTO report_images (report_id, url, sort_order)
SELECT MAX(id), '/uploads/example.jpg', 0 FROM reports;

-- 3. A second citizen confirms (vouches for) a report — UNIQUE (report_id, user_id) blocks double votes
INSERT INTO report_confirmations (report_id, user_id, remarks)
SELECT r.id, u.id, 'Confirmed genuine active civic issue.'
FROM reports r JOIN users u ON u.email = 'citizen@civicfix.com'
ORDER BY r.id DESC LIMIT 1;

-- 4. Nearby open reports within ~500 m (bounding box; the API refines with an exact haversine check)
SELECT id, title, category, priority, latitude, longitude
FROM reports
WHERE status IN ('pending', 'assigned', 'in_progress')
  AND latitude  BETWEEN 30.7333 - 0.0045 AND 30.7333 + 0.0045
  AND longitude BETWEEN 76.7794 - 0.0052 AND 76.7794 + 0.0052;

-- 5. Admin priority queue (critical > high > medium > low, then most upvoted, then oldest)
SELECT r.id, r.title, r.priority,
       (SELECT COUNT(*) FROM report_upvotes u WHERE u.report_id = r.id) AS upvotes
FROM reports r
WHERE r.status IN ('pending', 'assigned', 'in_progress')
ORDER BY FIELD(r.priority, 'critical', 'high', 'medium', 'low'), upvotes DESC, r.created_at ASC;

-- 6. Reports with their images, upvote count and latest work order (assignedTo)
SELECT r.id, r.title, r.status,
       (SELECT GROUP_CONCAT(i.url ORDER BY i.sort_order) FROM report_images i WHERE i.report_id = r.id) AS images,
       (SELECT COUNT(*) FROM report_upvotes u WHERE u.report_id = r.id) AS upvotes,
       (SELECT MAX(w.id) FROM work_orders w WHERE w.report_id = r.id) AS latest_work_order_id
FROM reports r
ORDER BY r.created_at DESC;

-- 7. Admin creates a work order and moves the report to 'assigned' (run as one transaction)
START TRANSACTION;
INSERT INTO work_orders (report_id, assigned_contractor, status, priority, notes, created_by)
SELECT r.id, c.id, 'open', r.priority, 'Bring patching material', a.id
FROM reports r
JOIN users c ON c.email = 'contractor@civicfix.com'
JOIN users a ON a.email = 'admin@civicfix.com'
ORDER BY r.id DESC LIMIT 1;
UPDATE reports SET status = 'assigned' WHERE id = (SELECT report_id FROM work_orders WHERE id = LAST_INSERT_ID());
COMMIT;

-- 8. Audit trail of one report
SELECT h.created_at, h.old_status, h.new_status, COALESCE(u.name, 'System') AS changed_by, h.remarks
FROM report_status_history h LEFT JOIN users u ON u.id = h.changed_by
WHERE h.report_id = (SELECT MAX(id) FROM reports)
ORDER BY h.created_at, h.id;

-- 9. Leaderboard (top citizens by CivicCreds)
SELECT id, name, civic_creds, civic_score, citizen_tier
FROM users WHERE role = 'citizen' AND is_active = 1
ORDER BY civic_creds DESC, civic_score DESC LIMIT 10;

-- 10. Daily reward cap check: rewarded actions by one user in the last 24 h
SELECT u.name, h.action, COUNT(*) AS times_today
FROM creds_history h JOIN users u ON u.id = h.user_id
WHERE h.created_at >= UTC_TIMESTAMP() - INTERVAL 24 HOUR
GROUP BY u.name, h.action;

-- 11. Reporting views
SELECT * FROM v_unresolved_issues ORDER BY priority_score DESC;
SELECT * FROM v_road_health_metrics ORDER BY calculated_road_health_score ASC;
SELECT * FROM v_repair_company_performance;
SELECT * FROM v_recurring_problems_by_locality ORDER BY total_citizen_complaints DESC;

-- 12. Road segments with their polyline points
SELECT s.name, s.health_score, s.status, p.seq, p.latitude, p.longitude
FROM road_segments s JOIN road_segment_points p ON p.segment_id = s.id
ORDER BY s.health_score ASC, s.id, p.seq;
