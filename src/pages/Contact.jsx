import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Send,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      await emailjs.send(
        'service_8arl3p4',
        'template_a0pchb8',
        {
          from_name: form.name,
          from_email: form.email,
          message: form.message,
        },
        'n3eKQHIGU5NT-VBAm'
      );

      toast.success("Message sent successfully. We'll get back to you soon.");

      setForm({
        name: '',
        email: '',
        message: '',
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to send message. Please try again later.');
    }

    setSending(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-primary/10 blur-3xl rounded-full -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-violet-500/10 blur-3xl rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4" />
              We'd love to hear from you
            </div>

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg border border-border/40">
              <Mail className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Contact ToolHub
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Have feedback, found an issue, or want to suggest a new tool?
              Every message helps us improve QuickUtils and build a better
              experience for students, creators, professionals, and everyday users.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
            {/* Contact Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-5 premium-card panel-highlight"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.04] pointer-events-none" />

              <div className="relative space-y-2">
                <Label>Name</Label>

                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Your name"
                  required
                  className="rounded-2xl h-12"
                />
              </div>

              <div className="relative space-y-2">
                <Label>Email</Label>

                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  required
                  className="rounded-2xl h-12"
                />
              </div>

              <div className="relative space-y-2">
                <Label>Message</Label>

                <Textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  placeholder="Tell us how we can help..."
                  required
                  rows={6}
                  className="rounded-2xl resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full rounded-2xl h-12 text-base font-medium shadow-lg"
              >
                <Send className="w-4 h-4 mr-2" />

                {sending ? 'Sending Message...' : 'Send Message'}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-1 leading-relaxed">
                We usually reply within 24–48 hours. 
                Including screenshots or tool names can help us resolve issues faster.
              </p>
            </motion.form>

            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-5"
            >
              <div className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-5">
                  What can you contact us about?
                </h2>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">
                        Feedback & Suggestions
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Share ideas for new tools, workflows, or improvements that
                        would make QuickUtils more useful.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Headphones className="w-5 h-5 text-violet-500" />
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">
                        Support & Technical Issues
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Found a bug or tool issue? Let us know and we'll work on fixing it quickly.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">
                        Privacy & Trust
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Many QuickUtils tools process files directly in your browser whenever possible,
                        helping improve privacy and speed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/10 p-6 shadow-xl">
                <h3 className="text-lg font-semibold mb-3">
                  Built for everyday productivity
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  QuickUtils helps students, creators, professionals, and exam applicants
                  simplify tasks like PDF compression, image resizing, passport photo editing,
                  file conversion, and more — directly from the browser.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}