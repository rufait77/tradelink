'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/layout/navbar';
import { Footer } from '../../../components/layout/footer';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { PageLoader } from '../../../components/ui/spinner';
import api from '../../../lib/api';
import {
  Star, MapPin, Briefcase, Calendar,
  Shield, ShieldCheck, FileCheck, Award,
} from 'lucide-react';

interface ContractorData {
  userId: string;
  user: { name: string };
  tradeTypes: string[];
  bio: string;
  city: string;
  state: string;
  yearsExperience: number;
  avgRating: number;
  totalJobsCompleted: number;
  photoUrl?: string;
  licenseNumber?: string;
  insuranceUrl?: string;
  isAdminVerified?: boolean;
  certifications?: Array<{ name: string; verified: boolean }>;
}

interface Review {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  dimension?: string;
  reviewer: { name: string };
  job: { title: string };
}

export default function PublicProfilePage() {
  const { id } = useParams();
  const [contractor, setContractor] = useState<ContractorData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, reviewsRes] = await Promise.all([
          api.get(`/contractors/${id}`),
          api.get(`/contractors/${id}/reviews`).catch(() => ({ data: { data: [] } })),
        ]);
        setContractor(profileRes.data.data);
        setReviews(reviewsRes.data.data || []);
      } catch { /* 404 handled gracefully */ }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) return <><Navbar /><PageLoader /><Footer /></>;

  if (!contractor) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <div className="text-center">
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Contractor Not Found</h1>
            <p className="text-surface-muted">This profile doesn&apos;t exist or has been removed.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Group reviews by dimension
  const clientReviews = reviews.filter(r => r.dimension === 'client_facing');
  const referralReviews = reviews.filter(r => r.dimension === 'referral_quality');
  const jobQualityReviews = reviews.filter(r => r.dimension === 'job_quality');

  function avgOfDimension(arr: Review[]) {
    if (!arr.length) return null;
    return arr.reduce((sum, r) => sum + r.rating, 0) / arr.length;
  }

  const clientAvg = avgOfDimension(clientReviews);
  const referralAvg = avgOfDimension(referralReviews);
  const jobAvg = avgOfDimension(jobQualityReviews);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-narrow px-4 space-y-6">
          {/* Header */}
          <Card className="flex flex-col sm:flex-row items-center gap-6">
            {contractor.photoUrl ? (
              <img src={contractor.photoUrl} alt={contractor.user.name}
                className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center shrink-0">
                <span className="text-3xl font-bold text-amber-400">{contractor.user.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <h1 className="text-2xl font-heading font-bold text-white">{contractor.user.name}</h1>
                {contractor.isAdminVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start text-sm text-surface-muted flex-wrap">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" /> {contractor.avgRating.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {contractor.totalJobsCompleted} jobs</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {contractor.city}, {contractor.state}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {contractor.yearsExperience} years exp.</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {contractor.tradeTypes.map((t) => (
                  <Badge key={t} variant="amber">{t.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* Trust & Verification */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="!p-4 text-center">
              <Shield className={`w-6 h-6 mx-auto mb-1.5 ${contractor.licenseNumber ? 'text-emerald-400' : 'text-surface-border'}`} />
              <p className="text-xs text-surface-muted">License</p>
              <p className={`text-xs font-medium ${contractor.licenseNumber ? 'text-emerald-400' : 'text-surface-muted'}`}>
                {contractor.licenseNumber || 'Not provided'}
              </p>
            </Card>
            <Card className="!p-4 text-center">
              <FileCheck className={`w-6 h-6 mx-auto mb-1.5 ${contractor.insuranceUrl ? 'text-emerald-400' : 'text-surface-border'}`} />
              <p className="text-xs text-surface-muted">Insurance</p>
              <p className={`text-xs font-medium ${contractor.insuranceUrl ? 'text-emerald-400' : 'text-surface-muted'}`}>
                {contractor.insuranceUrl ? 'On File' : 'Not provided'}
              </p>
            </Card>
            <Card className="!p-4 text-center">
              <ShieldCheck className={`w-6 h-6 mx-auto mb-1.5 ${contractor.isAdminVerified ? 'text-emerald-400' : 'text-surface-border'}`} />
              <p className="text-xs text-surface-muted">Admin Verified</p>
              <p className={`text-xs font-medium ${contractor.isAdminVerified ? 'text-emerald-400' : 'text-surface-muted'}`}>
                {contractor.isAdminVerified ? 'Yes' : 'Pending'}
              </p>
            </Card>
            <Card className="!p-4 text-center">
              <Award className="w-6 h-6 mx-auto mb-1.5 text-amber-500" />
              <p className="text-xs text-surface-muted">Completed</p>
              <p className="text-xs font-medium text-amber-400">{contractor.totalJobsCompleted} jobs</p>
            </Card>
          </div>

          {/* Rating Dimensions */}
          {(clientAvg || referralAvg || jobAvg) && (
            <Card>
              <h2 className="text-lg font-heading font-semibold text-white mb-4">Rating Breakdown</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Client Rating', avg: clientAvg, count: clientReviews.length },
                  { label: 'Referral Quality', avg: referralAvg, count: referralReviews.length },
                  { label: 'Job Quality', avg: jobAvg, count: jobQualityReviews.length },
                ].map(({ label, avg, count }) => (
                  <div key={label} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className={`w-4 h-4 ${avg ? 'text-amber-500 fill-amber-500' : 'text-surface-border'}`} />
                      <span className="text-lg font-heading font-bold text-white">
                        {avg ? avg.toFixed(1) : '—'}
                      </span>
                    </div>
                    <p className="text-xs text-surface-muted">{label}</p>
                    <p className="text-[10px] text-surface-muted">{count} review{count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Bio */}
          {contractor.bio && (
            <Card>
              <h2 className="text-lg font-heading font-semibold text-white mb-3">About</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{contractor.bio}</p>
            </Card>
          )}

          {/* Reviews */}
          <div>
            <h2 className="text-lg font-heading font-semibold text-white mb-4">Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <Card><p className="text-sm text-surface-muted text-center py-4">No reviews yet.</p></Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <Card key={r.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{r.reviewer.name}</p>
                        {r.dimension && (
                          <Badge variant="default" className="text-[10px]">
                            {r.dimension === 'client_facing' ? 'Client' :
                             r.dimension === 'referral_quality' ? 'Referral' : 'Job Quality'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-surface-border'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{r.text}</p>
                    <p className="text-xs text-surface-muted mt-2">
                      For: {r.job.title} · {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
