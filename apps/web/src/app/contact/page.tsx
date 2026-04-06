'use client';
import { Navbar } from '../../components/layout/navbar';
import { Footer } from '../../components/layout/footer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, MapPin, Phone } from 'lucide-react';
import api from '@/lib/api';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = e.target as HTMLFormElement;
      const data = {
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
        email: (form.elements.namedItem('email') as HTMLInputElement).value,
        message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
      };
      await api.post('/settings/contact', data);
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      form.reset();
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-narrow px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">Get In Touch</h1>
            <p className="text-surface-muted max-w-lg mx-auto">
              Have questions about Tradelink? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 max-w-4xl mx-auto">
            {/* Contact info */}
            <div className="md:col-span-2 space-y-6">
              <div className="glass-card p-5 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Email</p>
                  <p className="text-xs text-surface-muted">Tradelinkpro.net@gmail.com</p>
                </div>
              </div>
              <div className="glass-card p-5 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Phone</p>
                  <p className="text-xs text-surface-muted">(803) 394-6335</p>
                </div>
              </div>
              <div className="glass-card p-5 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Location</p>
                  <p className="text-xs text-surface-muted">United States</p>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <form onSubmit={handleSubmit} className="md:col-span-3 glass-card p-6 space-y-4">
              <Input label="Full Name" name="name" placeholder="John Smith" required />
              <Input label="Email" name="email" type="email" placeholder="Tradelinkpro.net@gmail.com" required />
              <div className="space-y-1.5">
                <label className="label">Message</label>
                <textarea
                  name="message"
                  rows={5}
                  className="input-field resize-none"
                  placeholder="Tell us how we can help..."
                  required
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">Send Message</Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
