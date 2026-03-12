'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/layout/navbar';
import { Footer } from '../../../components/layout/footer';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { PageLoader } from '../../../components/ui/spinner';
import api from '../../../lib/api';
import { Star, MapPin, Briefcase, Calendar } from 'lucide-react';

interface ContractorData {
  userId: string; user: { name: string };
  tradeTypes: string[]; bio: string; city: string; state: string;
  yearsExperience: number; avgRating: number; totalJobsCompleted: number;
  photoUrl?: string;
}

interface Review {
  id: string; rating: number; text: string; createdAt: string;
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

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-narrow px-4 space-y-8">
          {/* Header */}
          <Card className="flex flex-col sm:flex-row items-center gap-6">
            {contractor.photoUrl ? (
              <img src={contractor.photoUrl} alt={contractor.user.name} className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-amber-400">{contractor.user.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-heading font-bold text-white">{contractor.user.name}</h1>
              <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start text-sm text-surface-muted">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" /> {contractor.avgRating.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {contractor.totalJobsCompleted} jobs</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {contractor.city}, {contractor.state}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {contractor.yearsExperience} years exp.</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {contractor.tradeTypes.map((t) => <Badge key={t} variant="amber">{t}</Badge>)}
              </div>
            </div>
          </Card>

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
                      <p className="text-sm font-medium text-white">{r.reviewer.name}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-surface-border'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{r.text}</p>
                    <p className="text-xs text-surface-muted mt-2">For: {r.job.title}</p>
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
