import React, { useState } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationBell.css';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  } = useNotifications();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    // You can add navigation logic here based on notification type
    console.log('Notification clicked:', notification);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-container" style={{ position: 'relative' }}>
      <div className="notification-bell" onClick={toggleDropdown}>
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAllNotifications}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''} ${
                    notification.priority === 'high' ? 'high-priority' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      {notification.icon || '📢'}
                    </div>
                    <div className="notification-text">
                      <div className="notification-title">
                        {notification.title}
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-time">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                  <button
                    className="notification-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notification.id);
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            backgroundColor: 'transparent'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;