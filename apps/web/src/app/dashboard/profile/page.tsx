'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { useAuthStore } from '../../../store/auth.store';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { User, Camera, Save, Star, Briefcase, MapPin } from 'lucide-react';

const TRADE_OPTIONS = [
  'Landscaping','Roofing','HVAC','Plumbing','Electrical','Painting','Carpentry','Flooring','Masonry','Cleaning','GeneralContracting','Other',
].map((t) => ({ label: t === 'GeneralContracting' ? 'General Contracting' : t, value: t }));

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map((s) => ({ label: s, value: s }));

interface Profile {
  tradeTypes: string[]; bio: string; licenseNumber?: string;
  streetAddress: string; city: string; state: string; zipCode: string;
  yearsExperience: number; avgRating: number; totalEarned: number;
  totalReferrals: number; totalJobsCompleted: number; photoUrl?: string;
}

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/contractors/profile');
      const p = res.data.data;
      setProfile(p);
      setBio(p.bio || '');
      setLicenseNumber(p.licenseNumber || '');
      setStreetAddress(p.streetAddress || '');
      setCity(p.city || '');
      setState(p.state || '');
      setZipCode(p.zipCode || '');
      setYearsExperience(p.yearsExperience || 0);
      setSelectedTrades(p.tradeTypes || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/contractors/profile', {
        tradeTypes: selectedTrades, bio, licenseNumber: licenseNumber || undefined,
        streetAddress, city, state, zipCode, yearsExperience: Number(yearsExperience),
      });
      toast.success('Profile updated!');
      await fetchMe();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      await api.post('/contractors/profile/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo uploaded!');
      await load();
      await fetchMe();
    } catch { toast.error('Failed to upload photo'); }
    finally { setUploading(false); }
  }

  function toggleTrade(t: string) {
    setSelectedTrades((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 5 ? [...prev, t] : prev
    );
  }

  if (loading) return <div className="space-y-4"><Card className="h-48 skeleton" /><Card className="h-64 skeleton" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-white">My Profile</h1>

      {/* Profile header */}
      <Card className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          {profile?.photoUrl ? (
            <img src={profile.photoUrl} alt="Profile" className="w-24 h-24 rounded-2xl object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
              <User className="w-10 h-10 text-amber-500" />
            </div>
          )}
          <label className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
            <Camera className="w-6 h-6 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} disabled={uploading} />
          </label>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-heading font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-surface-muted">{user?.email}</p>
          <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start">
            <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" /><span className="text-sm text-slate-200">{profile?.avgRating?.toFixed(1) || '0.0'}</span></div>
            <div className="flex items-center gap-1"><Briefcase className="w-4 h-4 text-blue-400" /><span className="text-sm text-slate-200">{profile?.totalJobsCompleted || 0} jobs</span></div>
            <div className="flex items-center gap-1"><MapPin className="w-4 h-4 text-emerald-400" /><span className="text-sm text-slate-200">{city}, {state}</span></div>
          </div>
        </div>
      </Card>

      {/* Trade types */}
      <Card>
        <h3 className="text-lg font-heading font-semibold text-white mb-4">Trade Specialties</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TRADE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => toggleTrade(t.value)}
              className={`p-2.5 rounded-xl text-xs font-medium text-left transition-all border ${
                selectedTrades.includes(t.value)
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                  : 'bg-navy-900 border-surface-border text-slate-300 hover:border-amber-500/30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Profile details */}
      <Card className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-white">Profile Details</h3>
        <div className="space-y-1.5">
          <label className="label">Bio</label>
          <textarea className="input-field resize-none" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="License Number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
          <Input label="Years of Experience" type="number" value={yearsExperience} onChange={(e) => setYearsExperience(Number(e.target.value))} />
        </div>
      </Card>

      {/* Location */}
      <Card className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-white">Service Area</h3>
        <Input label="Street Address" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Select label="State" options={US_STATES} value={state} onChange={setState} />
          <Input label="ZIP Code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
        </div>
      </Card>

      <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
        <Save className="w-4 h-4" /> Save Profile
      </Button>
    </div>
  );
}
