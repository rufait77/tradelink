'use client';
import { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuthStore } from '../../../store/auth.store';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { Settings, Lock, LogOut, Trash2 } from 'lucide-react';
import { useT, apiErrorMessage } from '../../../i18n';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const t = useT();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { toast.error(t('settings.password.mismatch')); return; }
    setChangePwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword, confirmNewPassword });
      toast.success(t('settings.password.success'));
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(apiErrorMessage(err, t, t('settings.password.failed')));
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
        <Settings className="w-6 h-6 text-amber-500" /> {t('settings.title')}
      </h1>

      {/* Account info */}
      <Card>
        <h2 className="text-lg font-heading font-semibold text-white mb-4">{t('settings.account.title')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-surface-border/50">
            <span className="text-sm text-surface-muted">{t('settings.account.name')}</span>
            <span className="text-sm text-slate-200">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-surface-border/50">
            <span className="text-sm text-surface-muted">{t('settings.account.email')}</span>
            <span className="text-sm text-slate-200">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-surface-muted">{t('settings.account.status')}</span>
            <span className="text-sm text-emerald-400">{t('settings.account.active')}</span>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <h2 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-500" /> {t('settings.password.title')}
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label={t('settings.password.current')}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label={t('settings.password.new')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText={t('auth.field.passwordRule')}
            required
          />
          <Input
            label={t('settings.password.confirm')}
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={changePwLoading}>{t('settings.password.submit')}</Button>
        </form>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/20">
        <h2 className="text-lg font-heading font-semibold text-white mb-4">{t('settings.actions.title')}</h2>
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> {t('settings.actions.signOut')}
          </Button>
          <Button variant="danger" className="w-full" onClick={() => toast.info(t('settings.actions.deleteNote'))}>
            <Trash2 className="w-4 h-4" /> {t('settings.actions.delete')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
