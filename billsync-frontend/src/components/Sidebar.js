import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaFileInvoice, 
  FaPlus, 
  FaBox, 
  FaUsers, 
  FaChartBar, 
  FaCog
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
    { path: '/invoices', label: 'Invoices', icon: FaFileInvoice },
    { path: '/invoices/create', label: 'Create Invoice', icon: FaPlus },
    { path: '/products', label: 'Products', icon: FaBox },
    { path: '/clients', label: 'Clients', icon: FaUsers },
    { path: '/deleted-invoices', label: 'Deleted Invoices', icon: FaFileInvoice },
    { path: '/profit', label: 'Profit', icon: FaChartBar },
    { path: '/settings', label: 'Settings', icon: FaCog },
    { path: '/my', label: 'My', icon: FaTachometerAlt }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Navigation</h3>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="sidebar-icon" />
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        {/* Removed total invoices and revenue stats */}
      </div>
    </aside>
  );
};

export default Sidebar;