import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// Invoice API endpoints
export const invoiceAPI = {
  // Create new invoice - real backend API
  createInvoice: async (invoiceData) => {
    const response = await api.post('/invoices', invoiceData);
    return response.data;
  },

  // Get all invoices - real backend API
  getInvoices: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  // Get single invoice
  getInvoice: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  // Update invoice
  updateInvoice: async (id, invoiceData) => {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },

  // Delete invoice
  deleteInvoice: async (id) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },

  // Send invoice email - supports optional PDF attachment via multipart/form-data
  sendInvoiceEmail: async (id, emailData) => {
    // If a pdfBlob is provided, send as multipart/form-data
    if (emailData.pdfBlob instanceof Blob) {
      const form = new FormData();
      // Include multiple alias fields to maximize backend compatibility
      const to = emailData.toEmail || emailData.to_email || '';
      const subject = emailData.subject || '';
      const message = emailData.message || emailData.body || '';
      form.append('toEmail', to);
      form.append('to_email', to);
      form.append('subject', subject);
      form.append('message', message);
      form.append('body', message);
      // Attach as a File so filename is preserved
      const filename = emailData.filename || `Invoice_${id}.pdf`;
      const file = new File([emailData.pdfBlob], filename, { type: 'application/pdf' });
      // Common field names servers may expect
      form.append('file', file);
      form.append('attachment', file);

      // Do NOT set Content-Type explicitly; let the browser set the boundary
      const response = await api.post(`/invoices/${id}/email`, form);
      return response.data;
    }
    // Fallback: JSON body without attachment
    const response = await api.post(`/invoices/${id}/email`, {
      toEmail: emailData.toEmail,
      subject: emailData.subject,
      message: emailData.message,
    });
    return response.data;
  },

  // Get invoice PDF
  getInvoicePDF: async (id) => {
    const response = await api.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Mark invoice as paid
  markAsPaid: async (id) => {
    const response = await api.patch(`/invoices/${id}/paid`);
    return response.data;
  },

  // Get invoice statistics
  getInvoiceStats: async () => {
    const response = await api.get('/invoices/stats');
    return response.data;
  },
};

// Payments API endpoints (Razorpay via backend REST)
export const paymentsAPI = {
  createOrder: async (invoiceId) => {
    const res = await api.post('/payments/create-order', { invoice_id: invoiceId });
    return res.data; // { order, key_id }
  },
  createLink: async (invoiceId) => {
    const res = await api.post('/payments/create-link', { invoice_id: invoiceId });
    return res.data; // { payment_link }
  },
};

// Profit API endpoints
export const profitAPI = {
  // Get overall and per-client profit summary
  getSummary: async () => {
    const response = await api.get('/profits/summary');
    return response.data;
  },
};

// Customer API endpoints
export const customerAPI = {
  // Get all customers
  getCustomers: async () => {
    const response = await api.get('/customers');
    return response.data;
  },

  // Get single customer
  getCustomer: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  // Create customer
  createCustomer: async (customerData) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },

  // Update customer
  updateCustomer: async (id, customerData) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  // Delete customer
  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  // Get customer replies
  getCustomerReplies: async (customerId) => {
    const response = await api.get(`/customers/${customerId}/replies`);
    return response.data;
  },

  // Send reply to customer
  sendReply: async (customerId, replyData) => {
    const response = await api.post(`/customers/${customerId}/replies`, replyData);
    return response.data;
  },
};

// Notification API endpoints
export const notificationAPI = {
  // Get all notifications - MOCK implementation for frontend-only
  getNotifications: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get notifications from localStorage
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    return notifications;
  },

  // Mark notification as read - MOCK implementation for frontend-only
  markAsRead: async (id) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Update in localStorage
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const updatedNotifications = notifications.map(notif => 
      notif.id === id ? { ...notif, isRead: true } : notif
    );
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    return { success: true };
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const updated = notifications.map(n => ({ ...n, isRead: true, read: true }));
    localStorage.setItem('notifications', JSON.stringify(updated));
    return { success: true };
  },

  // Clear notification
  clearNotification: async (id) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const updated = notifications.filter(n => n.id !== id);
    localStorage.setItem('notifications', JSON.stringify(updated));
    return { success: true };
  },

  // Clear all notifications
  clearAllNotifications: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem('notifications', JSON.stringify([]));
    return { success: true };
  },

  // Subscribe to real-time notifications (WebSocket/SSE)
  subscribeToNotifications: (callback) => {
    // Backend stream endpoint is not available; disable SSE to avoid 404 spam
    // Fallback polling is already implemented in NotificationContext
    try {
      const streamUrl = `${API_BASE_URL}/notifications/stream`;
      // Optionally, we could test availability first, but to avoid 404 noise we no-op.
      // const eventSource = new EventSource(streamUrl);
      // return () => eventSource.close();
    } catch (e) {
      // ignore
    }
    // Return a no-op unsubscribe
    return () => {};
  },
};

// Product API endpoints
export const productAPI = {
  // Get all products
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  // Get single product
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Create product
  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Update product
  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  // Delete product
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

export default api;