import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './pages/PlaceholderPage';
import StaffMembers from './pages/StaffMembers';
import RolesManagement from './pages/RolesManagement';
import PermissionsManagement from './pages/PermissionsManagement';
import CompanyProfile from './pages/CompanyProfile';
import Settings from './pages/Settings';
import BranchesManagement from './pages/BranchesManagement';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Attributes from './pages/Attributes';
import Terms from './pages/Terms';
import Inventory from './pages/Inventory';
import StockAdjustment from './pages/StockAdjustment';
import DamagedLostStock from './pages/DamagedLostStock';
import StockMovementHistory from './pages/StockMovementHistory';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import POS from './pages/POS';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Guest Routes */}
                    <Route path="/login" element={<Login />} />

                    {/* Authenticated Dashboard Routes */}
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        
                        {/* Core Operations */}
                        <Route path="pos" element={<POS />} />
                        <Route path="orders" element={<PlaceholderPage title="Order Ledger" />} />
                        
                        {/* Catalog & Supply */}
                        <Route path="products" element={<Products />} />
                        <Route path="products/create" element={<ProductForm />} />
                        <Route path="products/:id/edit" element={<ProductForm />} />
                        <Route path="attributes" element={<Attributes />} />
                        <Route path="terms" element={<Terms />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="inventory/adjust" element={<StockAdjustment />} />
                        <Route path="inventory/damaged-lost" element={<DamagedLostStock />} />
                        <Route path="inventory/movement-history" element={<StockMovementHistory />} />
                        <Route path="purchases" element={<PurchaseOrders />} />
                        <Route path="suppliers" element={<Suppliers />} />
                        <Route path="warehouses" element={<PlaceholderPage title="Warehouses" />} />
                        
                        {/* Accounting & Finance */}
                        <Route path="accounting" element={<PlaceholderPage title="General Ledger" />} />
                        <Route path="expenses" element={<PlaceholderPage title="Expenses Tracker" />} />
                        <Route path="payments" element={<PlaceholderPage title="Payments" />} />
                        <Route path="commissions" element={<PlaceholderPage title="Commissions" />} />
                        <Route path="cash-drawer" element={<PlaceholderPage title="Cash Drawer" />} />
                        
                        {/* Staff & Locations */}
                        <Route path="customers" element={<PlaceholderPage title="Customers Profile" />} />
                        <Route path="staff" element={<StaffMembers />} />
                        <Route path="roles" element={<RolesManagement />} />
                        <Route path="permissions" element={<PermissionsManagement />} />
                        <Route path="branches" element={<BranchesManagement />} />
                        <Route path="approvals" element={<PlaceholderPage title="Task Approvals" />} />
                        
                        {/* Integrations & Logs */}
                        <Route path="company" element={<CompanyProfile />} />
                        <Route path="shopify" element={<PlaceholderPage title="Shopify Sync" />} />
                        <Route path="woocommerce" element={<PlaceholderPage title="WooCommerce Sync" />} />
                        <Route path="activity-logs" element={<PlaceholderPage title="Activity Logs" />} />
                        <Route path="settings" element={<Settings />} />
                        
                        {/* Wildcard Fallback */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

const rootEl = document.getElementById('root');
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
