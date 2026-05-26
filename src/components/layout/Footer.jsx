import React from 'react'
import { Link } from 'react-router-dom'
import { Zap, Mail, ArrowRight } from 'lucide-react'

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
  { to: '/blog', label: 'Blog' },
  { to: '/jobs', label: 'Jobs' },
]

const TRUST_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Use' },
  { to: '/disclaimer', label: 'Disclaimer' },
  { to: '/editorial-policy', label: 'Editorial Policy' },
]

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/60 backdrop-blur-sm pb-3 pl-8 pr-10 pt-10">
      <div className="max-w-7xl mx-auto sm:px-6 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
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
              to="/contact"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact QuickUtils
            </Link>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wide text-foreground">Popular Tools</h4>
            <div className="flex flex-col gap-2">
              {TOOL_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                >
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wide text-foreground">Explore</h4>
            <div className="flex flex-col gap-2">
              {EXPLORE_LINKS.map(({ to, label }) => (
                <Link key={to} to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wide text-foreground">Trust & Policies</h4>
            <div className="flex flex-col gap-2">
              {TRUST_LINKS.map(({ to, label }) => (
                <Link key={to} to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-semibold text-foreground mb-1">Simple utility tools</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review important outputs before using them for official, financial, health, or legal decisions.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Copyright {new Date().getFullYear()} QuickUtils. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for useful, everyday web work.
          </p>
        </div>
      </div>
    </footer>
  )
}
