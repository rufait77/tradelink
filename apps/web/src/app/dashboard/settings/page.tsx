'use client';
import { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuthStore } from '../../../store/auth.store';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { Settings, Lock, LogOut, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { toast.error("Passwords don't match"); return; }
    setChangePwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword, confirmNewPassword });
      toast.success('Password changed!');
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangePwLoading(false);
    }
  }

  function handleLogout() {
    logout();
    window.location.href = '/login';
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6 text-amber-500" /> Settings
      </h1>

      {/* Account info */}
      <Card>
        <h2 className="text-lg font-heading font-semibold text-white mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-surface-border/50">
            <span className="text-sm text-surface-muted">Name</span>
            <span className="text-sm text-slate-200">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-surface-border/50">
            <span className="text-sm text-surface-muted">Email</span>
            <span className="text-sm text-slate-200">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-surface-muted">Account Status</span>
            <span className="text-sm text-emerald-400">Active</span>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <h2 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-500" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Min 8 chars, 1 uppercase, 1 number"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={changePwLoading}>Update Password</Button>
        </form>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/20">
        <h2 className="text-lg font-heading font-semibold text-white mb-4">Account Actions</h2>
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
          <Button variant="danger" className="w-full" onClick={() => toast.info('Please contact support to delete your account.')}>
            <Trash2 className="w-4 h-4" /> Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
