import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Message sent! We\'ll get back to you soon.');
    setForm({ name: '', email: '', message: '' });
    setSending(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
          <p className="text-muted-foreground">Have a question or suggestion? We'd love to hear from you.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" required className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@email.com" required className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Your message..." required rows={5} className="rounded-xl" />
          </div>
          <Button type="submit" disabled={sending} className="w-full rounded-xl">
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}