import React from 'react'
import Link from 'next/link';
import { Zap, Mail, ArrowRight } from 'lucide-react'
import { CONTACT_EMAIL } from '@/config/site'
import { BmacFooterCard } from '@/components/shared/BuyMeCoffee'
import { reopenCookieConsent } from '@/components/shared/CookieConsent'

const TOOL_LINKS = [
  { to: '/tool/photo-kb-reducer', label: 'Photo KB Reducer' },
  { to: '/tool/exam-photo-cropper', label: 'Exam Photo Cropper' },
  { to: '/tool/exam-document-pdf-compressor', label: 'Exam PDF Compressor' },
  { to: '/tool/image-compressor', label: 'Image Compressor' },
  { to: '/tool/volumetric-weight-calculator', label: 'Volumetric Weight Calculator' },
  { to: '/tool/amazon-fee-calculator', label: 'Amazon Fee Calculator' },
]

const EXPLORE_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/tools', label: 'All Tools' },
  { to: '/categories', label: 'Categories' },
  { to: '/workflow', label: 'Workflows' },
  { to: '/blog', label: 'Blog' },
  { to: '/jobs', label: 'Jobs' },
]

const TRUST_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/team', label: 'Team' },
  { to: '/contact', label: 'Contact' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Use' },
  { to: '/disclaimer', label: 'Disclaimer' },
  { to: '/editorial-policy', label: 'Editorial Policy' },
  { to: '/corrections-policy', label: 'Corrections Policy' },
  { to: '/accessibility', label: 'Accessibility' },
  { to: '/job-sources-policy', label: 'Job Sources Policy' },
  { to: '/cookie-policy', label: 'Cookie Policy' },
]

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/60 backdrop-blur-sm pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">
                <span className="gradient-text">Quick</span>Utils
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Free online tools for PDF work, image editing, calculators, text cleanup,
              developer tasks, exam documents, sellers, and shipping estimates.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact QuickUtils
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-flex text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {CONTACT_EMAIL}
            </a>

            {/* Buy Me a Coffee support card */}
            <BmacFooterCard />
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-foreground">Popular Tools</h4>
            <div className="flex flex-col gap-2">
              {TOOL_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  href={to}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-0.5 transition-transform flex items-center gap-1 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
                >
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-foreground">Explore</h4>
            <div className="flex flex-col gap-2">
              {EXPLORE_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  href={to}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors hover:translate-x-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-foreground">Trust & Policies</h4>
            <div className="flex flex-col gap-2">
              {TRUST_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  href={to}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors hover:translate-x-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-border/60 bg-background/70 p-4 hover:border-primary/20 transition-colors">
              <p className="text-xs font-semibold text-foreground mb-1">Simple utility tools</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review important outputs before using them for official, financial, health, or legal decisions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <hr className="border-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Copyright {new Date().getFullYear()} QuickUtils. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                Built for useful, everyday web work.
              </p>
              <button
                id="footer-cookie-settings"
                onClick={reopenCookieConsent}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
              >
                Cookie Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
