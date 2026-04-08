const express = require('express')
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isAdmin = require('../../../middlewares/isAdmin')


router.get('/api/admin/report/:id', isAdmin, async (req, res) => {
    try {
    const reportId = req.params.id;
    
    const [reports] = await pool.query(
        `SELECT 
            br.*,
            b.name as bot_name,
            u.phone_number as reporter_name,
            DATE_FORMAT(br.created_at, '%Y-%m-%d %H:%i:%s') as created_at
        FROM bot_reports br
        JOIN bots b ON br.bot_id = b.id
        JOIN users u ON br.user_id = u.id
        WHERE br.id = ?`,
        [reportId]
    );
    
    if (reports.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(reports[0]);
    } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({ error: 'Failed to fetch report details' });
    }
    });
    
    
    router.get('/admin/reports', isAdmin, async (req, res) => {
    try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    
    const [reports] = await pool.query(
        `SELECT 
            br.*,
            b.name as bot_name,
            u.phone_number as reporter_name,
            DATE_FORMAT(br.created_at, '%Y-%m-%d %H:%i:%s') as created_at
        FROM bot_reports br
        JOIN bots b ON br.bot_id = b.id
        JOIN users u ON br.user_id = u.id
        ORDER BY br.created_at DESC
        LIMIT ? OFFSET ?`,
        [limit, offset]
    );
    
    
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM bot_reports');
    const totalReports = countResult[0].total;
    const totalPages = Math.ceil(totalReports / limit);
    
    
    const [pendingCountResult] = await pool.query(
        'SELECT COUNT(*) as pending FROM bot_reports WHERE status = ?',
        ['pending']
    );
    const pendingReports = pendingCountResult[0].pending;
    
    
    const [resolvedTodayResult] = await pool.query(
        `SELECT COUNT(*) as resolved 
         FROM bot_reports 
         WHERE status = 'resolved' 
         AND DATE(resolved_at) = CURDATE()`
    );
    const resolvedToday = resolvedTodayResult[0].resolved;
    
    
    const [avgResponseResult] = await pool.query(
        `SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_time 
         FROM bot_reports 
         WHERE status = 'resolved' 
         AND resolved_at IS NOT NULL`
    );
    const avgResponseTime = avgResponseResult[0].avg_time 
        ? `${Math.round(avgResponseResult[0].avg_time)}h` 
        : 'N/A';
    
    
    res.render('admin/reports', {
        reports,
        currentPage: page,
        totalPages,
        totalReports,
        pendingReports,
        resolvedToday,
        avgResponseTime
    });
    } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).send('Error fetching reports');
    }
    });
    
    
    
    router.post('/api/admin/update-report', isAdmin, async (req, res) => {
    try {
    const { reportId, status } = req.body;
    
    await pool.query(
        'UPDATE bot_reports SET status = ?, resolved_at = IF(? = "resolved", NOW(), NULL) WHERE id = ?',
        [status, status, reportId]
    );
    
    res.json({ message: 'Report status updated successfully' });
    } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report status' });
    }
    });
    module.exports = router;