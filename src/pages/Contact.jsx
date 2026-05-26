import React, { useState } from 'react'
import { Mail, MessageSquare, Send, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import emailjs from '@emailjs/browser'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const contactEmail = 'support@quickutils.page'
const contactDescription =
  'Contact QuickUtils to report tool issues, send feedback, ask privacy questions, or suggest new online utilities.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Contact', url: `${SITE_URL}/contact` },
])

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <StaticPageSEO
        title="Contact QuickUtils - Feedback, Support and Tool Issues"
        description={contactDescription}
        path="/contact"
        ogTitle="Contact QuickUtils"
        ogDescription="Send feedback, report broken tools, request improvements, or ask questions about QuickUtils."
        jsonLd={breadcrumbSchema}
      />

      <header className="mb-10">
        <p className="text-sm font-semibold text-primary mb-3">Contact</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Contact QuickUtils
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Have feedback, found an issue, or want to suggest a new tool? Send a message with
          enough detail for us to understand the page, tool, input, browser, or result involved.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8 space-y-5"
        >
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

          <Button type="submit" disabled={sending} className="w-full sm:w-auto">
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send message'}
          </Button>

          <p className="text-xs text-muted-foreground leading-relaxed">
            For issue reports, include the tool name, page URL, device, browser, and a short
            description of the input and expected result.
          </p>
        </form>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Email</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  You can also contact QuickUtils directly by email.
                </p>
                <a href={`mailto:${contactEmail}`} className="text-sm font-medium text-primary hover:text-primary/80">
                  {contactEmail}
                </a>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Feedback and suggestions</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Share unclear instructions, missing examples, broken links, confusing results,
                  accessibility issues, or ideas for new tools.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Privacy questions</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have a question about cookies, analytics, advertising, or file handling,
                  mention the specific tool or page so we can review it accurately.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
