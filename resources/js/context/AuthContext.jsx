import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('pos_erp_user');
            const token = localStorage.getItem('pos_erp_token');
            if (token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            return (savedUser && savedUser !== 'undefined') ? JSON.parse(savedUser) : null;
        } catch (e) {
            console.error('Failed to parse pos_erp_user from localStorage', e);
            localStorage.removeItem('pos_erp_user');
            localStorage.removeItem('pos_erp_token');
            return null;
        }
    });
    const [activeBranch, setActiveBranch] = useState(() => {
        return localStorage.getItem('pos_erp_branch') || 'Main Branch';
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('pos_erp_token');
        if (token) {
            axios.get('/api/profile')
                .then(response => {
                    const userData = response.data;
                    // Add avatar in case it is not returned
                    if (!userData.avatar) {
                        userData.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=4f46e5&color=fff&bold=true`;
                    }
                    setUser(userData);
                    localStorage.setItem('pos_erp_user', JSON.stringify(userData));
                })
                .catch(err => {
                    console.error('Failed to fetch profile', err);
                    if (err.response?.status === 401) {
                        setUser(null);
                        localStorage.removeItem('pos_erp_user');
                        localStorage.removeItem('pos_erp_token');
                        delete axios.defaults.headers.common['Authorization'];
                    }
                });
        }
    }, []);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const response = await axios.post('/api/login', { email, password });
            const { token, user: userData } = response.data;

            // Set default headers for subsequent requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            localStorage.setItem('pos_erp_token', token);
            localStorage.setItem('pos_erp_user', JSON.stringify(userData));

            setUser(userData);
            setLoading(false);
            return { success: true };
        } catch (err) {
            setLoading(false);
            const message = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Invalid credentials';
            return { success: false, message };
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/logout');
        } catch (err) {
            console.error('Logout error', err);
        } finally {
            setUser(null);
            localStorage.removeItem('pos_erp_user');
            localStorage.removeItem('pos_erp_token');
            delete axios.defaults.headers.common['Authorization'];
        }
    };

    const changeBranch = (branchName) => {
        setActiveBranch(branchName);
        localStorage.setItem('pos_erp_branch', branchName);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, activeBranch, changeBranch }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
