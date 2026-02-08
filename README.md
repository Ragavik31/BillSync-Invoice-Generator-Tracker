# BillSync - Invoice Generator and Tracker

BillSync is a comprehensive invoicing and billing management system designed for office supply businesses. It provides an intuitive interface for managing clients, creating invoices, tracking products, generating reports, and analyzing business profitability.

## 🎯 Features

- **Invoice Management**: Create, view, update, and delete invoices with ease
- **Client Management**: Manage client information and history
- **Product Tracking**: Maintain a catalog of office supply products
- **PDF Generation**: Generate and download invoices as PDF documents
- **Email Integration**: Send invoices directly via email
- **Dashboard Analytics**: Visual representation of business metrics and performance
- **Reporting**: Comprehensive reports and profit analysis
- **Notification System**: Real-time notifications for important events
- **Deleted Invoices Recovery**: Soft delete functionality to recover deleted invoices

## 📁 Project Structure

```
BillSync/
├── billsync-backend-node/    # Express.js backend API
│   ├── .env                  # Environment configuration
│   └── package.json          # Backend dependencies
│
└── billsync-frontend/        # React frontend application
    ├── public/               # Static assets
    ├── src/
    │   ├── components/       # Reusable React components
    │   │   ├── Navbar
    │   │   ├── Sidebar
    │   │   └── NotificationBell
    │   ├── pages/           # Application pages
    │   │   ├── Dashboard
    │   │   ├── Clients
    │   │   ├── CreateInvoice
    │   │   ├── Invoices
    │   │   ├── Products
    │   │   ├── Reports
    │   │   ├── Profit
    │   │   ├── Settings
    │   │   └── DeletedInvoices
    │   ├── services/        # API service calls
    │   ├── contexts/        # React Context for state management
    │   ├── utils/           # Utility functions
    │   │   ├── invoiceNumber.js
    │   │   ├── invoicePDF.js
    │   │   └── emailService.js
    │   ├── styles/          # Global and component styles
    │   └── App.js           # Root component
    └── package.json         # Frontend dependencies
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)

### Frontend
- **Library**: React 18.2.0
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **PDF Generation**: jsPDF with html2canvas
- **Email**: EmailJS
- **Charts**: Recharts
- **Icons**: React Icons
- **Date Handling**: date-fns
- **Styling**: CSS

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB installation)
- Modern web browser

## 🚀 Installation

### 1. Clone the Repository

```bash
cd Review2
git clone <repository-url>
```

### 2. Backend Setup

```bash
cd billsync-backend-node
npm install
```

Create a `.env` file in the `billsync-backend-node` directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=BillSync
JWT_SECRET=your_secret_key_here
PORT=5000
```

### 3. Frontend Setup

```bash
cd ../billsync-frontend
npm install
```

Update the API base URL in `src/services/api.js` if needed:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

## 🏃 Running the Application

### Start the Backend Server

```bash
cd billsync-backend-node
npm start
```

The backend server will run on `http://localhost:5000`

### Start the Frontend Development Server

In a new terminal:

```bash
cd billsync-frontend
npm start
```

The frontend will open at `http://localhost:3000`

## 📦 Available Scripts

### Frontend

- `npm start` - Start the development server
- `npm build` - Create a production build
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (irreversible)

### Backend

- `npm start` - Start the server
- `npm test` - Run tests (if configured)

## 🔑 Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT token generation |
| `PORT` | Server port (default: 5000) |

### Frontend

API configuration is typically set in `src/services/api.js`

## 📱 Application Pages

- **Dashboard**: Overview of business metrics and key statistics
- **Clients**: Manage client information and relationships
- **Invoices**: View, create, and manage all invoices
- **Create Invoice**: Generate new invoices with custom items
- **Products**: Maintain product/service catalog
- **Reports**: Comprehensive business reporting
- **Profit**: Profitability analysis and insights
- **Settings**: Configure application preferences
- **Deleted Invoices**: Recover and manage deleted invoices

## 🔌 Core Utilities

### invoiceNumber.js
Generates unique invoice numbers with customizable format

### invoicePDF.js
Converts invoice data to PDF format for download

### emailService.js
Integrates with EmailJS for sending invoices via email

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for secure authentication. Tokens are exchanged during user login and stored securely for subsequent API requests.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## 📝 License

This project is proprietary software. All rights reserved.

## 👤 Author

BillSync Development Team

## 🙋 Support

For issues, questions, or feature requests, please create an issue in the repository.

## 📅 Version

Current Version: 1.0.0

---

**Happy invoicing with BillSync!** 🎉
