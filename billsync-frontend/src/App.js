import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import Products from './pages/Products';
import Clients from './pages/Clients';
import Profit from './pages/Profit';
import DeletedInvoices from './pages/DeletedInvoices';
import Settings from './pages/Settings';
import My from './pages/My';
import './styles/App.css';

function App() {
  const LocationAwareLayout = ({ children }) => {
    return (
      <div className="app">
        <Navbar />
        <div className="app-container">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <NotificationProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <LocationAwareLayout>
                <Dashboard />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/invoices"
            element={
              <LocationAwareLayout>
                <Invoices />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/invoices/create"
            element={
              <LocationAwareLayout>
                <CreateInvoice />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/products"
            element={
              <LocationAwareLayout>
                <Products />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/clients"
            element={
              <LocationAwareLayout>
                <Clients />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/profit"
            element={
              <LocationAwareLayout>
                <Profit />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/deleted-invoices"
            element={
              <LocationAwareLayout>
                <DeletedInvoices />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <LocationAwareLayout>
                <Settings />
              </LocationAwareLayout>
            }
          />
          <Route
            path="/my"
            element={
              <LocationAwareLayout>
                <My />
              </LocationAwareLayout>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </NotificationProvider>
    </Router>
  );
}

export default App;