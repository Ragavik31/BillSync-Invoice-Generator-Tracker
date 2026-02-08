import React, { useState } from 'react';
import { FaSave, FaUser, FaBuilding, FaPalette, FaBell, FaLock, FaCreditCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@billsync.com',
    phone: '+1 (555) 123-4567',
    position: 'Office Manager',
    department: 'Administration'
  });

  const [companyData, setCompanyData] = useState({
    name: 'BillSync for Office Supplies',
    address: '123 Business Street, Suite 100',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'United States',
    phone: '+1 (555) 987-6543',
    email: 'info@billsync.com',
    website: 'www.billsync.com',
    taxId: '12-3456789',
    businessType: 'Corporation'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    invoiceReminders: true,
    lowStockAlerts: true,
    newOrderAlerts: false,
    paymentConfirmations: true,
    dailyReports: false,
    weeklyReports: true,
    monthlyReports: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: '30'
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'company', label: 'Company', icon: <FaBuilding /> },
    { id: 'appearance', label: 'Appearance', icon: <FaPalette /> },
    { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
    { id: 'billing', label: 'Billing', icon: <FaCreditCard /> }
  ];

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompanyChange = (field, value) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (setting, value) => {
    setNotificationSettings(prev => ({ ...prev, [setting]: value }));
  };



  const handleSave = (section) => {
    console.log(`Saving ${section} settings:`, 
      section === 'profile' ? profileData :
      section === 'company' ? companyData :
      section === 'notifications' ? notificationSettings : {}
    );
    alert(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
  };

  const renderProfileTab = () => (
    <div className="settings-section">
      <h3 className="section-title">Personal Information</h3>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">First Name</label>
          <input
            type="text"
            value={profileData.firstName}
            onChange={(e) => handleProfileChange('firstName', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input
            type="text"
            value={profileData.lastName}
            onChange={(e) => handleProfileChange('lastName', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => handleProfileChange('email', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleProfileChange('phone', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Position</label>
          <input
            type="text"
            value={profileData.position}
            onChange={(e) => handleProfileChange('position', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Department</label>
          <select
            value={profileData.department}
            onChange={(e) => handleProfileChange('department', e.target.value)}
            className="form-input"
          >
            <option value="Administration">Administration</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Operations">Operations</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
      </div>
      <div className="section-actions">
        <button onClick={() => handleSave('profile')} className="btn btn-primary">
          <FaSave /> Save Profile
        </button>
      </div>
    </div>
  );

  const renderCompanyTab = () => (
    <div className="settings-section">
      <h3 className="section-title">Company Information</h3>
      <div className="form-grid">
        <div className="form-group full-width">
          <label className="form-label">Company Name</label>
          <input
            type="text"
            value={companyData.name}
            onChange={(e) => handleCompanyChange('name', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group full-width">
          <label className="form-label">Business Address</label>
          <input
            type="text"
            value={companyData.address}
            onChange={(e) => handleCompanyChange('address', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">City</label>
          <input
            type="text"
            value={companyData.city}
            onChange={(e) => handleCompanyChange('city', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">State/Province</label>
          <input
            type="text"
            value={companyData.state}
            onChange={(e) => handleCompanyChange('state', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">ZIP/Postal Code</label>
          <input
            type="text"
            value={companyData.zipCode}
            onChange={(e) => handleCompanyChange('zipCode', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Country</label>
          <select
            value={companyData.country}
            onChange={(e) => handleCompanyChange('country', e.target.value)}
            className="form-input"
          >
            <option value="United States">United States</option>
            <option value="Canada">Canada</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Australia">Australia</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input
            type="tel"
            value={companyData.phone}
            onChange={(e) => handleCompanyChange('phone', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            value={companyData.email}
            onChange={(e) => handleCompanyChange('email', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Website</label>
          <input
            type="url"
            value={companyData.website}
            onChange={(e) => handleCompanyChange('website', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tax ID</label>
          <input
            type="text"
            value={companyData.taxId}
            onChange={(e) => handleCompanyChange('taxId', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group full-width">
          <label className="form-label">Business Type</label>
          <select
            value={companyData.businessType}
            onChange={(e) => handleCompanyChange('businessType', e.target.value)}
            className="form-input"
          >
            <option value="Corporation">Corporation</option>
            <option value="LLC">Limited Liability Company (LLC)</option>
            <option value="Partnership">Partnership</option>
            <option value="Sole Proprietorship">Sole Proprietorship</option>
          </select>
        </div>
      </div>
      <div className="section-actions">
        <button onClick={() => handleSave('company')} className="btn btn-primary">
          <FaSave /> Save Company Info
        </button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="settings-section">
      <h3 className="section-title">Notification Preferences</h3>
      <div className="settings-grid">
        <div className="setting-item">
          <div className="setting-info">
            <h4>Email Notifications</h4>
            <p>Receive notifications via email</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.emailNotifications}
              onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <h4>Invoice Reminders</h4>
            <p>Get notified about overdue invoices</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.invoiceReminders}
              onChange={(e) => handleNotificationChange('invoiceReminders', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <h4>Low Stock Alerts</h4>
            <p>Receive alerts when products run low</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.lowStockAlerts}
              onChange={(e) => handleNotificationChange('lowStockAlerts', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <h4>New Order Alerts</h4>
            <p>Get notified about new orders</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.newOrderAlerts}
              onChange={(e) => handleNotificationChange('newOrderAlerts', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <h4>Payment Confirmations</h4>
            <p>Receive payment confirmation emails</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.paymentConfirmations}
              onChange={(e) => handleNotificationChange('paymentConfirmations', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div className="section-actions">
        <button onClick={() => handleSave('notifications')} className="btn btn-primary">
          <FaSave /> Save Notification Settings
        </button>
      </div>
    </div>
  );



  const renderBillingTab = () => (
    <div className="settings-section">
      <h3 className="section-title">Billing Information</h3>
      <div className="billing-info">
        <div className="billing-card">
          <h4>Current Plan</h4>
          <div className="plan-details">
            <div className="plan-name">Professional Plan</div>
            <div className="plan-price">₹99/month</div>
            <div className="plan-features">
              <ul>
                <li>Unlimited invoices</li>
                <li>Up to 10 users</li>
                <li>Advanced reporting</li>
                <li>Priority support</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="billing-card">
          <h4>Billing History</h4>
          <div className="billing-history">
            <div className="billing-item">
              <div className="billing-date">July 1, 2024</div>
              <div className="billing-amount">₹99.00</div>
              <div className="billing-status paid">Paid</div>
            </div>
            <div className="billing-item">
              <div className="billing-date">June 1, 2024</div>
              <div className="billing-amount">₹99.00</div>
              <div className="billing-status paid">Paid</div>
            </div>
            <div className="billing-item">
              <div className="billing-date">May 1, 2024</div>
              <div className="billing-amount">₹99.00</div>
              <div className="billing-status paid">Paid</div>
            </div>
          </div>
        </div>
      </div>
      <div className="section-actions">
        <button className="btn btn-primary">
          <FaCreditCard /> Update Payment Method
        </button>
        <button className="btn btn-secondary">
          Change Plan
        </button>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="settings-section">
      <h3 className="section-title">Appearance Settings</h3>
      <div className="appearance-settings">
        <div className="setting-item">
          <div className="setting-info">
            <h4>Theme</h4>
            <p>Choose your preferred color theme</p>
          </div>
          <select className="form-input" style={{ width: '200px' }}>
            <option value="light">Light Theme</option>
            <option value="dark">Dark Theme</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <h4>Language</h4>
            <p>Select your preferred language</p>
          </div>
          <select className="form-input" style={{ width: '200px' }}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <h4>Date Format</h4>
            <p>Choose how dates are displayed</p>
          </div>
          <select className="form-input" style={{ width: '200px' }}>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
      <div className="section-actions">
        <button className="btn btn-primary">
          <FaSave /> Save Appearance Settings
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'company': return renderCompanyTab();
      case 'appearance': return renderAppearanceTab();
      case 'notifications': return renderNotificationsTab();
      case 'billing': return renderBillingTab();
      default: return renderProfileTab();
    }
  };

  return (
    <div className="settings">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and application preferences</p>
        </div>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="sidebar-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;