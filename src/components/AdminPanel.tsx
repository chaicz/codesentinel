/**
 * ============================================================================
 * FILE: AdminPanel.tsx
 * TYPE: Admin Dashboard Component
 * ============================================================================
 * 
 * PURPOSE:
 * Provides an admin dashboard for managing users with database connection.
 * Includes: view all users, reset passwords, update emails, 
 * toggle active status, and delete users.
 * 
 * DESIGN NOTES:
 * - Modal overlay panel
 * - Tab-based navigation (Overview, Users)
 * - Search functionality
 * - Confirmation dialogs for destructive actions
 * - Real-time statistics cards
 * 
 * API ENDPOINTS:
 * - GET /api/admin/users - Get all users
 * - GET /api/admin/stats - Get admin statistics
 * - POST /api/admin/password/reset - Reset user password
 * - POST /api/admin/user/delete - Delete user
 * - POST /api/admin/user/toggle-active - Toggle user active status
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Shield, Trash2, Key, AlertTriangle, 
  Search, RefreshCw, ChevronRight, X, Check, Loader2,
  BarChart3, UserCheck, UserX, Filter
} from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  aiProvider: string;
  aiModel: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  deactivatedUsers: number;
  adminCount: number;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; username: string; role?: string };
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Action modals
  const [actionModal, setActionModal] = useState<{
    type: 'password' | 'delete' | 'toggle';
    user?: AdminUser;
  } | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/stats', { credentials: 'include' }),
      ]);
      
      if (usersRes.status === 403) {
        setError('Admin access required.');
        return;
      }
      
      if (!usersRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      
      setUsers(usersData.users || []);
      setStats(statsData.stats || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Show success message
  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
    fetchData();
  };

  // Handle actions
  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    
    try {
      let res: Response;
      
      switch (actionModal.type) {
        case 'password':
          res = await fetch('/api/admin/password/reset', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: actionModal.user?.id, 
              newPassword: actionValue 
            }),
          });
          break;
          
        case 'delete':
          res = await fetch('/api/admin/user/delete', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: actionModal.user?.id }),
          });
          break;
          
        case 'toggle':
          res = await fetch('/api/admin/user/toggle-active', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: actionModal.user?.id, 
              isActive: !actionModal.user?.isActive 
            }),
          });
          break;
          
        default:
          throw new Error('Unknown action');
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }
      
      showSuccess(data.message);
      setActionModal(null);
      setActionValue('');
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);
    return matchesSearch && matchesStatus;
  });

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)' }}>
              <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Admin Panel
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                  ADMIN
                </span>
              </h2>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Manage users and system settings
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-800"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg flex items-center gap-2 bg-emerald-500/20 text-emerald-400 text-sm">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg flex items-center gap-2 bg-red-500/20 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'text-white' : ''
            }`}
            style={{ 
              backgroundColor: activeTab === 'overview' ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === 'overview' ? 'var(--accent)' : 'var(--text-muted)'
            }}
          >
            <BarChart3 className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'users' ? 'text-white' : ''
            }`}
            style={{ 
              backgroundColor: activeTab === 'users' ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === 'users' ? 'var(--accent)' : 'var(--text-muted)'
            }}
          >
            <Users className="w-4 h-4" />
            Users
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/50">
              {users.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    DATABASE STATISTICS
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={Users}
                      label="Total Users"
                      value={stats.totalUsers}
                      color="#3b82f6"
                    />
                    <StatCard
                      icon={UserCheck}
                      label="Active Users"
                      value={stats.activeUsers}
                      color="#22c55e"
                    />
                    <StatCard
                      icon={Clock}
                      label="Inactive Users"
                      value={stats.inactiveUsers}
                      color="#f59e0b"
                    />
                    <StatCard
                      icon={Shield}
                      label="Administrators"
                      value={stats.adminCount}
                      color="#8b5cf6"
                    />
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search and Filter */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search by username or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                        style={{ 
                          backgroundColor: 'var(--bg-elevated)', 
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ 
                          backgroundColor: 'var(--bg-elevated)', 
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                    <button
                      onClick={fetchData}
                      className="p-2 rounded-lg cursor-pointer transition-colors"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>User</th>
                          <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                          <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Last Login</th>
                          <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>AI Config</th>
                          <th className="text-right py-3 px-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => (
                          <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-sm text-white">
                                  {user.username}
                                  {user.id === currentUser.id && (
                                    <span className="ml-2 text-[10px] text-amber-400">(you)</span>
                                  )}
                                  {user.role === 'admin' && (
                                    <span className="ml-2 text-[10px] text-amber-400">Admin</span>
                                  )}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {user.email || 'No email'}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {user.isActive ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                                  <span className="w-2 h-2 rounded-full bg-red-400" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {formatDate(user.lastLogin)}
                            </td>
                            <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <div className="flex items-center gap-1">
                                <span>{user.aiProvider}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>{user.aiModel}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1">
                                {/* Reset Password */}
                                <ActionButton
                                  icon={Key}
                                  title="Reset Password"
                                  onClick={() => setActionModal({ type: 'password', user })}
                                />
                                {/* Toggle Active */}
                                <ActionButton
                                  icon={user.isActive ? UserX : UserCheck}
                                  title={user.isActive ? 'Deactivate' : 'Activate'}
                                  onClick={() => setActionModal({ type: 'toggle', user })}
                                  variant={user.isActive ? 'warning' : 'success'}
                                />
                                {/* Delete */}
                                {user.id !== currentUser.id && (
                                  <ActionButton
                                    icon={Trash2}
                                    title="Delete User"
                                    onClick={() => setActionModal({ type: 'delete', user })}
                                    variant="danger"
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No users found matching your criteria.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div 
            className="w-full max-w-md mx-4 rounded-xl shadow-2xl p-6"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {actionModal.type === 'password' && 'Reset Password'}
              {actionModal.type === 'delete' && 'Delete User'}
              {actionModal.type === 'toggle' && (actionModal.user?.isActive ? 'Deactivate User' : 'Activate User')}
            </h3>

            <div className="mb-4">
              {actionModal.type === 'password' && (
                <>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                    Enter a new password for <strong>{actionModal.user?.username}</strong>:
                  </p>
                  <input
                    type="password"
                    placeholder="New password (8-128 characters)"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: 'var(--bg-elevated)', 
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </>
              )}

              {actionModal.type === 'delete' && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Are you sure you want to delete <strong>{actionModal.user?.username}</strong>? 
                  This action cannot be undone and will remove all their data.
                </p>
              )}

              {actionModal.type === 'toggle' && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {actionModal.user?.isActive
                    ? `Deactivate ${actionModal.user?.username}? They will not be able to log in until reactivated.`
                    : `Activate ${actionModal.user?.username}? They will be able to log in again.`
                  }
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActionModal(null); setActionValue(''); }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={
                  actionLoading || 
                  (actionModal.type === 'password' && actionValue.length < 8)
                }
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-50"
                style={{ 
                  backgroundColor: actionModal.type === 'delete' ? '#ef4444' : 'var(--accent)', 
                  color: 'white' 
                }}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                ) : (
                  actionModal.type === 'password' ? 'Save' : 'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div 
      className="p-4 rounded-lg"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({ 
  icon: Icon, 
  title, 
  onClick, 
  variant = 'default' 
}: { 
  icon: any; 
  title: string; 
  onClick: () => void; 
  variant?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const colors = {
    default: 'var(--text-muted)',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e',
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-slate-800"
      style={{ color: colors[variant] }}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
