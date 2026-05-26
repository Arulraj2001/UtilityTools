import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, ArrowRight, Shield, Zap, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const QUICK_LINKS = [
  'Compress PDF',
  'Image Compressor',
  'Photo KB Reducer',
  'EMI Calculator',
  'JSON Formatter',
  'BMI Calculator',
  'Railway Photo',
  'SIP Calculator',
]

export default function HeroSection({ toolCount }) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleSearch = (event) => {
    event.preventDefault()
    if (search.trim()) navigate(`/tools?q=${encodeURIComponent(search)}`)
  }

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 hero-visual-bg" />
      <div className="absolute inset-0 hero-grid-pattern pointer-events-none" />
      <div className="hidden md:block absolute top-10 left-[8%] w-72 h-72 rounded-full bg-primary/12 blur-3xl animate-float pointer-events-none" />
      <div className="hidden lg:block absolute top-16 right-[12%] w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-floatBlob pointer-events-none" style={{ animationDelay: '1.8s' }} />
      <div className="hidden lg:block absolute bottom-8 left-[15%] w-96 h-96 rounded-full bg-slate-200/5 blur-3xl animate-float pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="transition-opacity duration-500 ease-out">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {toolCount}+ free tools for common online tasks
            </span>
          </div>

          <div className="relative inline-flex items-center justify-center w-full mb-6">
            <div className="absolute inset-x-0 -top-4 h-28 rounded-full bg-gradient-to-b from-primary/15 to-transparent blur-3xl opacity-90 pointer-events-none" />
            <h1 className="relative text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              Free online tools
              <br />
              <span className="gradient-text">for everyday work</span>
            </h1>
          </div>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Use QuickUtils for PDFs, images, calculators, text, developer tasks,
            SEO checks, exam documents, seller tools, and shipping estimates.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-card/95 rounded-[1.75rem] border border-white/10 shadow-2xl shadow-primary/10 transition-shadow duration-300 overflow-hidden hero-search-panel">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/15 to-transparent blur-3xl opacity-80 pointer-events-none" />
                <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0 z-10" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search for any tool..."
                  className="border-0 focus-visible:ring-0 text-base h-13 bg-transparent py-3.5 relative z-10"
                />
                <Button type="submit" className="mr-1.5 rounded-xl h-9 px-5 bg-primary hover:bg-primary/90 shadow-sm z-10">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {QUICK_LINKS.map((link) => (
              <button
                key={link}
                type="button"
                onClick={() => navigate(`/tools?q=${encodeURIComponent(link)}`)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors motion-safe:transform-gpu motion-safe:transition-transform hover:scale-[1.02] active:scale-95"
              >
                {link}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Fast tools for routine tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-500" />
              <span>Browser-side processing where supported</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>No sign-up for most public tools</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
