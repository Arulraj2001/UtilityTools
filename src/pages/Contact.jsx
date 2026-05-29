import React, { useState } from 'react'
import { Mail, MessageSquare, Send, ShieldCheck, Clock, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import emailjs from '@emailjs/browser'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const contactEmail = 'support@quickutils.page'
const contactDescription =
  'Contact QuickUtils to report tool issues, send feedback, ask privacy questions, or suggest new online utilities. We aim to respond within a few business days.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Contact', url: `${SITE_URL}/contact` },
])

const faqItems = [
  {
    question: 'What if a tool gives a wrong output?',
    answer:
      'Use the contact form to report it — include the tool name and what you expected.',
  },
  {
    question: 'Can I suggest a new tool?',
    answer: 'Yes, describe the tool and its use case in your message.',
  },
  {
    question: 'How do I report an ad issue?',
    answer: 'Mention the page URL and describe the issue.',
  },
]

const reachUsItems = [
  'Broken or inaccurate tools',
  'Tool suggestions and new feature ideas',
  'Feedback on content quality or instructions',
  'General questions about QuickUtils',
]

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [sending, setSending] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSending(true)

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
      )

      toast.success('Message sent successfully.')
      setForm({ name: '', email: '', message: '' })
    } catch (error) {
      console.error(error)
      toast.error('Failed to send message. Please try again later or email us directly.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Contact QuickUtils — Report Issues and Send Feedback"
        description={contactDescription}
        path="/contact"
        ogTitle="Contact QuickUtils"
        ogDescription="Send feedback, report broken tools, request improvements, or ask questions about QuickUtils — 150+ free online utility tools."
        jsonLd={breadcrumbSchema}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Contact</p>
          <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            QuickUtils is a free online toolkit offering 150+ utilities — PDF tools, image
            editors, calculators, developer tools, SEO helpers, and more. If something is not
            working as expected, you have a suggestion, or you just want to get in touch, use
            the form below or email us directly.
          </p>
        </header>

        {/* What you can reach us about */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">What you can reach us about</h2>
          <ul className="space-y-2">
            {reachUsItems.map((item) => (
              <li
                key={item}
                className="rounded-lg bg-muted/40 hover:bg-muted/70 p-3 flex gap-3 items-start text-muted-foreground leading-relaxed transition-colors"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Contact form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border/60 bg-card/80 p-6 sm:p-8 space-y-5"
          >
            <h2 className="text-xl font-semibold mb-1">Send a message</h2>

            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Tell us what happened, which page you used, or what you would like improved."
                required
                rows={7}
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="w-full sm:w-auto focus-visible:ring-offset-2"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send message'}
            </Button>

            <p className="text-xs text-muted-foreground leading-relaxed">
              For issue reports, include the tool name, page URL, device, browser, and a short
              description of the input and expected result.
            </p>
          </form>

          {/* Sidebar info cards */}
          <aside className="space-y-5">
            <section className="rounded-xl border border-border/60 bg-card/80 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Email us directly</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Prefer email? Reach us at the address below.
                  </p>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    {contactEmail}
                  </a>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-card/80 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Response time</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We aim to respond within a few business days.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-card/80 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Feedback and suggestions</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Share unclear instructions, missing examples, broken links, confusing
                    results, accessibility issues, or ideas for new tools.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-card/80 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Privacy questions</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If you have a question about cookies, analytics, advertising, or file
                    handling, mention the specific tool or page so we can review it accurately.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* FAQ section */}
        <section className="mt-12 pt-8 border-t border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-xl font-semibold">Frequently asked questions</h2>
          </div>
          <div className="space-y-6">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-border/60 bg-card/80 p-6 hover:border-primary/20 transition-colors"
              >
                <p className="font-semibold mb-2">{item.question}</p>
                <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
