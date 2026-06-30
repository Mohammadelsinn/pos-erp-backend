import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';

export default function MainLayout() {
    const { user, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // If still checking auth state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);
    const closeMobileSidebar = () => setMobileSidebarOpen(false);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            
            {/* Collapsible Sidebar */}
            <Sidebar 
                isOpen={sidebarOpen} 
                toggleSidebar={toggleSidebar} 
                isMobileOpen={mobileSidebarOpen}
                closeMobileSidebar={closeMobileSidebar}
            />

            {/* Main Content Area */}
            <div 
                className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
                    sidebarOpen ? 'lg:pl-64' : 'lg:pl-[72px]'
                }`}
            >
                {/* Header Navbar */}
                <TopNavbar 
                    toggleSidebar={toggleSidebar}
                    toggleMobileSidebar={toggleMobileSidebar}
                />

                {/* Page view outlet wrapper */}
                <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>

        </div>
    );
}
