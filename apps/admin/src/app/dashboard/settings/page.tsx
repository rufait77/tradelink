'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Save, Loader2 } from 'lucide-react';

interface SettingDef { key: string; label: string; description: string; type: 'number' | 'boolean' | 'text' }

const SETTING_DEFS: SettingDef[] = [
  { key: 'signup_fee', label: 'Signup Fee ($)', description: 'One-time fee for contractors to register', type: 'number' },
  { key: 'subscription_fee', label: 'Subscription Fee ($/month)', description: 'Monthly subscription fee for contractors', type: 'number' },
  { key: 'commission_pct', label: 'Commission Rate (%)', description: 'Percentage referral commission earned per completed job', type: 'number' },
  { key: 'platform_fee_pct', label: 'Platform Fee (%)', description: 'Platform fee deducted from each job payment', type: 'number' },
  { key: 'min_job_budget', label: 'Min Job Budget ($)', description: 'Minimum budget a job can be posted with', type: 'number' },
  { key: 'max_job_budget', label: 'Max Job Budget ($)', description: 'Maximum budget a job can be posted with', type: 'number' },
  { key: 'job_expiry_days', label: 'Job Expiry (days)', description: 'Days before an open job automatically expires', type: 'number' },
  { key: 'admin_notification_email', label: 'Admin Notification Email', description: 'Receives alerts for signups, payments, jobs, disputes', type: 'text' },
  { key: 'developer_mode', label: 'Developer Mode', description: 'When ON — all payments bypassed for testing', type: 'boolean' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then((r) => {
      const s: Record<string, string> = {};
      Object.entries(r.data.data.settings as Record<string, string>).forEach(([k, v]) => { s[k] = String(v); });
      setSettings(s);
    }).catch(console.error);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      SETTING_DEFS.forEach(({ key }) => {
        if (settings[key] !== undefined) {
          payload[key] = settings[key]; // Send as strings — API handles conversion
        }
      });
      const r = await api.put('/admin/settings', payload);
      // Refresh local state from API response
      if (r.data.data?.settings) {
        const s: Record<string, string> = {};
        Object.entries(r.data.data.settings as Record<string, string>).forEach(([k, v]) => { s[k] = String(v); });
        setSettings(s);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure fees, rates, and platform behaviour</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#050d1a] font-bold rounded-xl text-sm transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-4">
        {SETTING_DEFS.map(({ key, label, description, type }) => (
          <div key={key} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{label}</p>
                <p className="text-sm text-slate-500 mt-0.5">{description}</p>
              </div>
              {type === 'boolean' ? (
                /* Toggle switch */
                <button
                  type="button"
                  aria-label={`Toggle ${label}`}
                  onClick={() => setSettings(s => ({ ...s, [key]: s[key] === 'true' ? 'false' : 'true' }))}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings[key] === 'true' ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${settings[key] === 'true' ? 'left-7' : 'left-1'}`} />
                </button>
              ) : type === 'text' ? (
                <input
                  type="text"
                  placeholder={description}
                  value={settings[key] ?? ''}
                  onChange={(e) => setSettings(s => ({ ...s, [key]: e.target.value }))}
                  className="w-72 bg-[#0a1628] border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={label}
                  value={settings[key] ?? ''}
                  onChange={(e) => setSettings(s => ({ ...s, [key]: e.target.value }))}
                  className="w-32 text-right bg-[#0a1628] border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
            {key === 'developer_mode' && settings[key] === 'true' && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-400">
                ⚠️ Developer Mode is ON — payment requirements are bypassed for all contractors and customers.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

