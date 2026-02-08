import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('billsync_notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter(n => !n.read).length);
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('billsync_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (notification) => {
    const newNotification = {
      id: notification.id || Date.now().toString(),
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
      icon: notification.icon,
      priority: notification.priority || 'medium',
      invoiceNumber: notification.invoiceNumber
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Store in localStorage for persistence
    const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const updatedNotifications = [newNotification, ...existingNotifications];
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications.slice(0, 50))); // Keep only last 50
    
    return newNotification;
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotification = async (notificationId) => {
    try {
      await notificationAPI.clearNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error clearing notification:', error);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const clearAllNotifications = async () => {
    try {
      await notificationAPI.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      const notifications = await notificationAPI.getNotifications();
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Set up real-time notifications
  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription (if backend supports it)
    const unsubscribe = notificationAPI.subscribeToNotifications((notification) => {
      addNotification(notification);
    });

    // Fallback: Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Simulate receiving a customer reply notification
  const simulateCustomerReply = (invoiceNumber, customerName, message) => {
    addNotification({
      type: 'customer_reply',
      title: `New reply from ${customerName}`,
      message: message,
      invoiceNumber: invoiceNumber,
      icon: '💬',
      priority: 'high'
    });
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAllNotifications,
      simulateCustomerReply
    }}>
      {children}
    </NotificationContext.Provider>
  );
};