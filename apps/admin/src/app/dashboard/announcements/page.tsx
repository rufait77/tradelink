'use client';
import { useState } from 'react';
import api from '../../../../lib/api';
import { Send, Loader2 } from 'lucide-react';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [tradeType, setTradeType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);
  const [error, setError] = useState('');

  async function send() {
    if (!title || !message) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/admin/announcements/broadcast', { title, message, ...(tradeType && { tradeType }) });
      setResult(res.data.data);
      setTitle(''); setMessage(''); setTradeType('');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <p className="text-slate-400 text-sm mt-1">Broadcast notifications to all contractors or by trade type</p>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title..."
              className="w-full bg-[#0a1628] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              rows={4} placeholder="Announcement body..."
              className="w-full bg-[#0a1628] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Trade Type <span className="text-slate-500">(leave blank for all)</span></label>
            <input value={tradeType} onChange={(e) => setTradeType(e.target.value)}
              placeholder="e.g. Plumbing, Electrical, HVAC..."
              className="w-full bg-[#0a1628] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
          {result && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">✅ Sent to {result.sent} contractor{result.sent !== 1 ? 's' : ''}</div>}

          <button onClick={send} disabled={loading || !title || !message}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#050d1a] font-bold rounded-xl text-sm transition-all disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? 'Sending...' : 'Broadcast Announcement'}
          </button>
        </div>
      </div>
    </div>
  );
}
