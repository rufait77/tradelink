'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { useAuthStore } from '../../../../../store/auth.store';
import api from '../../../../../lib/api';
import { getSocket, emitTyping, emitStopTyping } from '../../../../../lib/socket';
import { formatRelativeTime } from '../../../../../lib/utils';
import {
  ArrowLeft, Send, Smile, Flag, Paperclip, Check, CheckCheck,
  MoreHorizontal, X, Star, MapPin, ExternalLink, User,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tradelinkpro.net';
const ASSETS_BASE = API_BASE.endsWith('/api')
  ? API_BASE.slice(0, -4)
  : API_BASE.replace(/\/+$/, '');

// ─── Types ──────────────────────────────────────────────────────────────────

interface Partner {
  id: string; name: string; email?: string;
  profile?: { photoUrl?: string; tradeTypes?: string[]; city?: string; state?: string; avgRating?: number };
}

interface DmMessage {
  id: string; senderId: string; receiverId: string;
  content: string; attachments?: any; isRead: boolean;
  reactions?: Record<string, string[]>;
  createdAt: string;
  sender?: { id: string; name: string; profile?: { photoUrl?: string } };
}

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '💯'];

function resolveUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${ASSETS_BASE}${url}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DmChatPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.userId as string;
  const { user } = useAuthStore();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [reportingMsg, setReportingMsg] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Load thread ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/dm/${partnerId}`);
        setPartner(res.data.data.partner);
        setMessages(res.data.data.messages || []);
      } catch {
        setPartner(null);
      } finally {
        setLoading(false);
      }
    }
    if (partnerId) load();
  }, [partnerId]);

  // ─── Auto-scroll ────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Socket.IO real-time ────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (data: { message: DmMessage }) => {
      if (data.message.senderId === partnerId || data.message.receiverId === partnerId) {
        setMessages(prev => [...prev, data.message]);
        // Mark as read if from partner
        if (data.message.senderId === partnerId) {
          api.put(`/dm/${partnerId}/read`).catch(() => {});
        }
      }
    };

    const handleTyping = (data: { userId: string; typing: boolean }) => {
      if (data.userId === partnerId) {
        setIsTyping(data.typing);
      }
    };

    const handleRead = (data: { readBy: string }) => {
      if (data.readBy === partnerId) {
        setMessages(prev => prev.map(m => m.senderId === user?.id ? { ...m, isRead: true } : m));
      }
    };

    const handleReaction = (data: { messageId: string; reactions: any }) => {
      setMessages(prev => prev.map(m =>
        m.id === data.messageId ? { ...m, reactions: data.reactions } : m
      ));
    };

    socket.on('dm:new', handleNew);
    socket.on('dm:typing', handleTyping);
    socket.on('dm:read', handleRead);
    socket.on('dm:reaction', handleReaction);

    return () => {
      socket.off('dm:new', handleNew);
      socket.off('dm:typing', handleTyping);
      socket.off('dm:read', handleRead);
      socket.off('dm:reaction', handleReaction);
    };
  }, [partnerId, user?.id]);

  // ─── Send message ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/dm/${partnerId}`, { content: input.trim() });
      setMessages(prev => [...prev, res.data.data.message]);
      setInput('');
      emitStopTyping(partnerId);
      inputRef.current?.focus();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to send message';
      alert(msg);
    } finally {
      setSending(false);
    }
  }, [input, partnerId, sending]);

  // ─── Typing indicator ──────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    emitTyping(partnerId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitStopTyping(partnerId), 2000);
  };

  // ─── Reactions ──────────────────────────────────────────────
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const res = await api.post(`/dm/${messageId}/react`, { emoji });
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: res.data.data.reactions } : m
      ));
    } catch { /* ignore */ }
    setShowEmojiFor(null);
  };

  // ─── Report ─────────────────────────────────────────────────
  const handleReport = async () => {
    if (!reportingMsg || !reportReason.trim()) return;
    try {
      await api.post(`/dm/${reportingMsg}/report`, { reason: reportReason.trim() });
      setReportingMsg(null);
      setReportReason('');
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <User className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400">User not found</p>
        <Button onClick={() => router.push('/dashboard/messages')}>Back to Messages</Button>
      </div>
    );
  }

  const partnerPhoto = resolveUrl(partner.profile?.photoUrl);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-4 border-b border-surface-border mb-4">
        <button onClick={() => router.push('/dashboard/messages')}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Link href={`/contractors/${partnerId}`} className="flex items-center gap-3 flex-1 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
            {partnerPhoto ? (
              <img src={partnerPhoto} alt={partner.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                <span className="text-sm font-bold text-amber-400">{partner.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white group-hover:text-amber-400 transition flex items-center gap-1.5">
              {partner.name}
              <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {partner.profile?.tradeTypes?.[0] && (
                <span>{partner.profile.tradeTypes[0].replace(/([A-Z])/g, ' $1').trim()}</span>
              )}
              {partner.profile?.city && partner.profile?.state && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" /> {partner.profile.city}, {partner.profile.state}
                </span>
              )}
              {partner.profile?.avgRating != null && partner.profile.avgRating > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {partner.profile.avgRating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* ─── Messages Area ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-1 px-1 -mx-1 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Send className="w-7 h-7 text-amber-500" />
            </div>
            <p className="text-slate-400 text-sm">
              Start a conversation with {partner.name.split(' ')[0]}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.senderId === user?.id;
            const showAvatar = !isMine && (i === 0 || messages[i - 1].senderId !== msg.senderId);
            const reactions = msg.reactions as Record<string, string[]> | null;

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  {!isMine && showAvatar ? (
                    <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 mb-1">
                      {partnerPhoto ? (
                        <img src={partnerPhoto} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-400">{partner.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  ) : !isMine ? (
                    <div className="w-7 shrink-0" />
                  ) : null}

                  <div className="relative">
                    {/* Bubble */}
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? 'bg-amber-500 text-[#050d1a] rounded-br-md'
                          : 'bg-[#0f1d32] text-slate-200 border border-white/5 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Reactions */}
                    {reactions && Object.keys(reactions).length > 0 && (
                      <div className={`flex gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className="text-xs px-1.5 py-0.5 rounded-full bg-surface-card border border-surface-border hover:bg-white/10 transition"
                          >
                            {emoji} {users.length > 1 ? users.length : ''}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Meta: time + read receipt */}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-slate-600">{formatRelativeTime(msg.createdAt)}</span>
                      {isMine && (
                        msg.isRead
                          ? <CheckCheck className="w-3 h-3 text-blue-400" />
                          : <Check className="w-3 h-3 text-slate-600" />
                      )}
                    </div>

                    {/* Hover actions */}
                    <div className={`absolute top-0 ${isMine ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition flex gap-0.5`}>
                      <button
                        onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                        className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300"
                        title="React"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      {!isMine && (
                        <button
                          onClick={() => { setReportingMsg(msg.id); setMenuOpen(null); }}
                          className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-red-400"
                          title="Report"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Emoji picker */}
                    {showEmojiFor === msg.id && (
                      <div className={`absolute ${isMine ? 'right-0' : 'left-0'} -top-10 z-10 flex gap-0.5 p-1.5 bg-surface-card border border-surface-border rounded-xl shadow-xl`}>
                        {EMOJI_LIST.map(em => (
                          <button key={em} onClick={() => handleReact(msg.id, em)}
                            className="p-1 hover:bg-white/10 rounded-md text-sm transition">
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-slate-500">{partner.name.split(' ')[0]} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Input Area ──────────────────────────────────────────── */}
      <div className="pt-4 border-t border-surface-border mt-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Message ${partner.name.split(' ')[0]}...`}
            className="flex-1 px-4 py-3 bg-[#0a1628] border border-surface-border rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
            style={{ color: '#e2e8f0' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] rounded-xl hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-amber-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── Report Modal ────────────────────────────────────────── */}
      {reportingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-400" /> Report Message
              </h3>
              <button onClick={() => { setReportingMsg(null); setReportReason(''); }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              This report will be sent to Tradelink admins for review. Please describe the issue.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe why you're reporting this message..."
              rows={3}
              className="w-full px-3 py-2 bg-[#050d1a] border border-surface-border rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setReportingMsg(null); setReportReason(''); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                Cancel
              </button>
              <button onClick={handleReport} disabled={!reportReason.trim()}
                className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-400 disabled:opacity-50 transition">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
