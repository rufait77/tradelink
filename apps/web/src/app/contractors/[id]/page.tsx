'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star, MapPin, Briefcase, Calendar, Shield, Award,
  Clock, ExternalLink, ArrowLeft, MessageSquare,
  CheckCircle2, User, ChevronRight, Send,
  ShieldCheck, FileCheck,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tradelinkpro.net';
// Base URL for static assets (uploads). If API_BASE uses a subdomain (api.xxx), use it directly.
// If it uses a path suffix like /api, strip that for asset URLs.
const ASSETS_BASE = API_BASE.endsWith('/api')
  ? API_BASE.slice(0, -4)
  : API_BASE.replace(/\/+$/, '');

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContractorProfile {
  id: string;
  userId: string;
  tradeTypes: string[];
  bio: string;
  licenseNumber?: string;
  certifications?: Array<{ name: string; verified: boolean }>;
  city: string;
  state: string;
  zipCode: string;
  yearsExperience: number;
  avgRating: number;
  avgResponseTime?: number;
  totalReferrals: number;
  totalJobsCompleted: number;
  photoUrl?: string;
  isAdminVerified: boolean;
  createdAt: string;
  user: { id: string; name: string; createdAt: string };
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  text?: string;
  type?: string;
  dimension?: string;
  createdAt: string;
  reviewer: { id: string; name: string; profile?: { photoUrl?: string } };
  job?: { title: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTrade(t: string) {
  return t.replace(/([A-Z])/g, ' $1').trim();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function timeAgo(d: string) {
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function renderStars(rating: number, size = 'w-4 h-4') {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star
      key={i}
      className={`${size} ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
    />
  ));
}

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${ASSETS_BASE}${url}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profRes, revRes] = await Promise.all([
          fetch(`${API_BASE}/contractors/${id}`),
          fetch(`${API_BASE}/contractors/${id}/reviews`),
        ]);
        if (!profRes.ok) throw new Error('not_found');
        const profData = await profRes.json();
        const revData = await revRes.json();
        // The API wraps profile in { profile } or returns flat
        const p = profData.data?.profile || profData.data;
        setProfile(p);
        setReviews(revData.data?.reviews || revData.data || []);
        setReviewTotal(revData.data?.total || (revData.data?.reviews || revData.data || []).length);
      } catch {
        setError('not_found');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  // ─── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ─── Error / Not Found ────────────────────────────────────────
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
            <User className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Contractor Not Found</h1>
          <p className="text-slate-400 text-sm">This profile doesn&apos;t exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-[#050d1a] font-semibold rounded-xl hover:bg-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Go Home
          </button>
        </div>
      </div>
    );
  }

  const memberSince = formatDate(profile.user?.createdAt || profile.createdAt);
  const hasLocation = profile.city && profile.state;
  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('tradelink_token');

  // Rating dimension grouping
  const clientReviews = reviews.filter(r => r.dimension === 'client_facing' || r.type === 'client_to_contractor');
  const referralReviews = reviews.filter(r => r.dimension === 'referral_quality' || r.type === 'referee_to_contractor');
  const jobReviews = reviews.filter(r => r.dimension === 'job_quality' || r.type === 'contractor_to_referee');
  function avgOf(arr: Review[]) { return arr.length ? arr.reduce((s, r) => s + r.rating, 0) / arr.length : null; }

  return (
    <div className="min-h-screen bg-[#050d1a]">
      {/* ─── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#050d1a]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <span className="text-xs font-black text-[#050d1a]">TL</span>
            </div>
            <span className="text-lg font-bold text-white group-hover:text-amber-400 transition"
              style={{ fontFamily: 'Sora, sans-serif' }}>
              Tradelink
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition">
                  Log In
                </Link>
                <Link href="/signup"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] text-sm font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-[#0a1628] to-emerald-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl shadow-amber-500/10">
                {profile.photoUrl ? (
                  <img src={resolveUrl(profile.photoUrl)} alt={profile.user?.name || 'Contractor'}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                    <span className="text-4xl font-black text-amber-500">
                      {(profile.user?.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {profile.isAdminVerified && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Name + Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
                  style={{ fontFamily: 'Sora, sans-serif' }}>
                  {profile.user?.name || 'Contractor'}
                </h1>
                {profile.isAdminVerified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Pro
                  </span>
                )}
              </div>

              <p className="text-lg text-amber-400 font-medium mt-1.5">
                {profile.tradeTypes.length > 0
                  ? profile.tradeTypes.slice(0, 3).map(formatTrade).join(' · ')
                  : 'Contractor'}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-slate-400">
                {hasLocation && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-500" /> {profile.city}, {profile.state}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" /> Member since {memberSince}
                </span>
                {profile.avgResponseTime != null && profile.avgResponseTime > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" /> Avg response: {profile.avgResponseTime.toFixed(1)}h
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-5">
                {isLoggedIn ? (
                  (() => {
                    // Check if this is the logged-in user's own profile
                    let loggedInUserId: string | null = null;
                    try {
                      const token = localStorage.getItem('tradelink_token');
                      if (token) {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        loggedInUserId = payload.userId || payload.sub;
                      }
                    } catch {}
                    const isOwnProfile = loggedInUserId === profile.userId;

                    return isOwnProfile ? (
                      <Link href="/dashboard/profile"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] font-bold text-sm rounded-xl hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20">
                        <User className="w-4 h-4" /> Edit Profile
                      </Link>
                    ) : (
                      <Link href={`/dashboard/messages/dm/${profile.userId}`}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] font-bold text-sm rounded-xl hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20">
                        <MessageSquare className="w-4 h-4" /> Message
                      </Link>
                    );
                  })()
                ) : (
                  <Link href="/signup"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] font-bold text-sm rounded-xl hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20">
                    <Send className="w-4 h-4" /> Join to Connect
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Bar ───────────────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-[#0a1628]/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
            <div className="py-5 px-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {renderStars(profile.avgRating)}
              </div>
              <p className="text-2xl font-bold text-white">{profile.avgRating > 0 ? profile.avgRating.toFixed(1) : '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{reviewTotal} review{reviewTotal !== 1 ? 's' : ''}</p>
            </div>
            <div className="py-5 px-4 text-center">
              <Briefcase className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{profile.totalJobsCompleted}</p>
              <p className="text-xs text-slate-500 mt-0.5">Jobs Completed</p>
            </div>
            <div className="py-5 px-4 text-center">
              <Award className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{profile.yearsExperience || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Years Experience</p>
            </div>
            <div className="py-5 px-4 text-center">
              <ExternalLink className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{profile.totalReferrals || 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">Referrals Made</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* About */}
        {profile.bio && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"
              style={{ fontFamily: 'Sora, sans-serif' }}>
              <User className="w-5 h-5 text-amber-500" /> About
            </h2>
            <div className="rounded-2xl bg-[#0a1628] border border-white/5 p-6">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            </div>
          </section>
        )}

        {/* Trade Specialties */}
        {profile.tradeTypes.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"
              style={{ fontFamily: 'Sora, sans-serif' }}>
              <Briefcase className="w-5 h-5 text-amber-500" /> Trade Specialties
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.tradeTypes.map((t) => (
                <span key={t}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/15 transition">
                  {formatTrade(t)}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Credentials */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Sora, sans-serif' }}>
            <Shield className="w-5 h-5 text-amber-500" /> Credentials & Verification
          </h2>
          <div className="rounded-2xl bg-[#0a1628] border border-white/5 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CredentialItem
                icon={<CheckCircle2 className={`w-5 h-5 ${profile.isAdminVerified ? 'text-emerald-400' : 'text-slate-600'}`} />}
                bgColor={profile.isAdminVerified ? 'bg-emerald-500/10' : 'bg-slate-800'}
                title="Identity Verified"
                subtitle={profile.isAdminVerified ? 'Verified by Tradelink admin' : 'Pending verification'}
              />
              <CredentialItem
                icon={<Award className={`w-5 h-5 ${profile.licenseNumber ? 'text-blue-400' : 'text-slate-600'}`} />}
                bgColor={profile.licenseNumber ? 'bg-blue-500/10' : 'bg-slate-800'}
                title="Contractor License"
                subtitle={profile.licenseNumber ? `License #${profile.licenseNumber}` : 'Not provided'}
              />
              <CredentialItem
                icon={<FileCheck className="w-5 h-5 text-slate-600" />}
                bgColor="bg-slate-800"
                title="Insurance"
                subtitle="Contact for details"
              />
              <CredentialItem
                icon={<Calendar className="w-5 h-5 text-purple-400" />}
                bgColor="bg-purple-500/10"
                title="Experience"
                subtitle={profile.yearsExperience > 0 ? `${profile.yearsExperience} years in the trade` : 'Not specified'}
              />
            </div>

            {/* Certifications */}
            {profile.certifications && (profile.certifications as any[]).length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Certifications</h3>
                <div className="space-y-2">
                  {(profile.certifications as any[]).map((cert: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                      <Award className={`w-4 h-4 ${cert.verified ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className="text-sm text-slate-300">{cert.name}</span>
                      {cert.verified && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Verified</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Rating Dimensions */}
        {(avgOf(clientReviews) || avgOf(referralReviews) || avgOf(jobReviews)) && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"
              style={{ fontFamily: 'Sora, sans-serif' }}>
              <Star className="w-5 h-5 text-amber-500" /> Rating Breakdown
            </h2>
            <div className="rounded-2xl bg-[#0a1628] border border-white/5 p-6">
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'Client Rating', avg: avgOf(clientReviews), count: clientReviews.length, color: 'text-blue-400' },
                  { label: 'Referral Quality', avg: avgOf(referralReviews), count: referralReviews.length, color: 'text-amber-400' },
                  { label: 'Job Quality', avg: avgOf(jobReviews), count: jobReviews.length, color: 'text-emerald-400' },
                ].map(({ label, avg, count, color }) => (
                  <div key={label} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className={`w-5 h-5 ${avg ? 'text-amber-500 fill-amber-500' : 'text-slate-700'}`} />
                      <span className="text-2xl font-bold text-white">{avg ? avg.toFixed(1) : '—'}</span>
                    </div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-[10px] text-slate-600">{count} review{count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Reviews */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Sora, sans-serif' }}>
            <Star className="w-5 h-5 text-amber-500" /> Reviews
            {reviewTotal > 0 && <span className="text-sm font-normal text-slate-500">({reviewTotal})</span>}
          </h2>

          {reviews.length === 0 ? (
            <div className="rounded-2xl bg-[#0a1628] border border-white/5 p-8 text-center">
              <Star className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No reviews yet</p>
              <p className="text-slate-600 text-xs mt-1">Reviews will appear after completed jobs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id}
                  className="rounded-2xl bg-[#0a1628] border border-white/5 p-5 hover:border-white/10 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                      {review.reviewer.profile?.photoUrl ? (
                        <img src={resolveUrl(review.reviewer.profile.photoUrl)}
                          alt={review.reviewer.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <span className="text-sm font-bold text-slate-400">
                            {review.reviewer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{review.reviewer.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5">{renderStars(review.rating, 'w-3.5 h-3.5')}</div>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-500">{timeAgo(review.createdAt)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                          {review.dimension === 'client_facing' || review.type === 'client_to_contractor' ? 'Client'
                            : review.dimension === 'referral_quality' || review.type === 'referee_to_contractor' ? 'Referral'
                            : 'Job Quality'}
                        </span>
                      </div>
                      {(review.comment || review.text) && (
                        <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">{review.comment || review.text}</p>
                      )}
                      {review.job?.title && (
                        <p className="text-xs text-slate-600 mt-1.5">For: {review.job.title}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {reviewTotal > reviews.length && (
                <button className="w-full py-3 text-center text-sm font-medium text-amber-400 hover:text-amber-300 transition rounded-xl border border-white/5 hover:border-amber-500/20 bg-[#0a1628]">
                  Show all {reviewTotal} reviews <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              )}
            </div>
          )}
        </section>

        {/* Service Area */}
        {hasLocation && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"
              style={{ fontFamily: 'Sora, sans-serif' }}>
              <MapPin className="w-5 h-5 text-amber-500" /> Service Area
            </h2>
            <div className="rounded-2xl bg-[#0a1628] border border-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{profile.city}, {profile.state} {profile.zipCode}</p>
                  <p className="text-xs text-slate-500 mt-0.5">And surrounding areas</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA Banner */}
        <section className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Ready to work with {(profile.user?.name || 'this contractor').split(' ')[0]}?
          </h2>
          <p className="text-sm text-slate-400 mb-5 max-w-md mx-auto">
            {isLoggedIn
              ? 'Send a message to discuss your project or browse their referral listings.'
              : 'Join Tradelink to connect with verified contractors and start earning referral commissions.'}
          </p>
          {isLoggedIn ? (
            <Link href={`/dashboard/messages/dm/${profile.userId}`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20">
              <MessageSquare className="w-5 h-5" /> Send a Message
            </Link>
          ) : (
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-[#050d1a] font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20">
              Join Tradelink — It&apos;s Free <ChevronRight className="w-5 h-5" />
            </Link>
          )}
        </section>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#050d1a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <span className="text-[8px] font-black text-[#050d1a]">TL</span>
            </div>
            <span className="text-sm text-slate-500">© {new Date().getFullYear()} Tradelink. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <Link href="/" className="hover:text-slate-400 transition">Home</Link>
            <Link href="/login" className="hover:text-slate-400 transition">Log In</Link>
            <Link href="/signup" className="hover:text-slate-400 transition">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Reusable Credential Item Component ──────────────────────────────────────

function CredentialItem({ icon, bgColor, title, subtitle }: {
  icon: React.ReactNode; bgColor: string; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
