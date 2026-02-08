import React from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-text">BillSync</span>
          <span className="brand-subtitle">for Office Supplies</span>
        </Link>
        
        <div className="navbar-actions">
          <NotificationBell />
          <Link to="/settings" className="settings-btn">Settings</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;