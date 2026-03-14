'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { PageLoader } from '../../../../components/ui/spinner';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Star, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function RatePage() {
  const { token } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [contractorName, setContractorName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/client/${token}`);
        const d = res.data.data;
        setContractorName(d.contractor?.name || 'Contractor');
        setJobTitle(d.job.title);
        setJobStatus(d.job.status);
      } catch {
        toast.error('Invalid or expired link');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleSubmit() {
    if (rating === 0) { toast.error('Please select a rating'); return; }

    setSubmitLoading(true);
    try {
      await api.post(`/client/${token}/rate`, {
        rating,
        text: reviewText || undefined,
      });
      toast.success('Thank you for your review!');
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  // Not in a ratable state
  const ratableStatuses = ['ClientConfirmed', 'Completed'];
  if (!ratableStatuses.includes(jobStatus) && !submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">Rating Not Available</h1>
          <p className="text-surface-muted">
            You can rate the contractor after the job has been confirmed as complete.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={() => router.push(`/client/${token}`)}
          className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Card className="text-center py-8">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-white mb-2">Thank You!</h1>
          <p className="text-surface-muted">
            Your {rating}-star review for {contractorName} has been submitted.
            This helps other clients make informed decisions.
          </p>
          <div className="flex items-center justify-center gap-1 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-6 h-6 ${i < rating ? 'text-amber-500 fill-amber-500' : 'text-surface-border'}`} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const displayRating = hoveredRating || rating;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => router.push(`/client/${token}`)}
        className="flex items-center gap-1 text-sm text-surface-muted hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <Card>
        <div className="text-center mb-6">
          <h1 className="text-xl font-heading font-bold text-white mb-1">
            Rate {contractorName}
          </h1>
          <p className="text-sm text-surface-muted">
            for &quot;{jobTitle}&quot;
          </p>
        </div>

        {/* Star rating */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const starValue = i + 1;
              return (
                <button
                  key={i}
                  onMouseEnter={() => setHoveredRating(starValue)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(starValue)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      starValue <= displayRating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-surface-border hover:text-amber-500/30'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <p className={`text-sm font-medium transition-colors ${
            displayRating > 0 ? 'text-amber-400' : 'text-surface-muted'
          }`}>
            {displayRating > 0 ? starLabels[displayRating] : 'Tap a star to rate'}
          </p>
        </div>

        {/* Review text */}
        <div className="mb-6">
          <label className="label mb-2 block">
            Write a review <span className="text-surface-muted">(optional)</span>
          </label>
          <textarea
            className="input-field resize-none w-full"
            rows={4}
            placeholder="Tell others about your experience working with this contractor..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
        </div>

        <Button className="w-full" size="lg" onClick={handleSubmit} loading={submitLoading}
          disabled={rating === 0}>
          <Send className="w-4 h-4" /> Submit Review
        </Button>
      </Card>
    </div>
  );
}
