// backend/routes/notification.routes.js

const router = require('express').Router();
const NotificationController = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Get all notifications
router.get('/', NotificationController.getNotifications);

// Get unread count only
router.get('/unread/count', NotificationController.getUnreadCount);

// Mark as read
router.put('/:notificationId/read', NotificationController.markAsRead);

// Mark all as read
router.put('/read/all', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', NotificationController.deleteNotification);

// Send test notification
router.post('/test', NotificationController.sendTestNotification);

module.exports = router;