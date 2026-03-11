'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Save, Loader2 } from 'lucide-react';

interface Setting { key: string; value: string; description?: string }

const SETTING_DEFS: { key: string; label: string; description: string; type: 'number' | 'boolean' }[] = [
  { key: 'signup_fee', label: 'Signup Fee ($)', description: 'One-time fee for contractors to register', type: 'number' },
  { key: 'subscription_fee', label: 'Subscription Fee ($/month)', description: 'Monthly subscription fee for contractors', type: 'number' },
  { key: 'commission_rate', label: 'Commission Rate (%)', description: 'Percentage referral commission earned per completed job', type: 'number' },
  { key: 'platform_fee_percent', label: 'Platform Fee (%)', description: 'Platform fee deducted from each job payment', type: 'number' },
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
      const payload: Record<string, string | number | boolean> = {};
      SETTING_DEFS.forEach(({ key, type }) => {
        if (settings[key] !== undefined) {
          payload[key] = type === 'boolean' ? settings[key] === 'true' : Number(settings[key]);
        }
      });
      await api.put('/admin/settings', payload);
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
                  onClick={() => setSettings(s => ({ ...s, [key]: s[key] === 'true' ? 'false' : 'true' }))}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings[key] === 'true' ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${settings[key] === 'true' ? 'left-7' : 'left-1'}`} />
                </button>
              ) : (
                <input
                  type="number"
                  min={0}
                  step={type === 'number' ? 0.01 : 1}
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
