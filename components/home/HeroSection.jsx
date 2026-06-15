'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Sparkles, ArrowRight, FileText, Image as ImageIcon, Camera, Calculator, Code2 } from 'lucide-react';

const QUICK_LINKS = [
  { name: 'Compress PDF', to: '/tool/compress-pdf', type: 'pdf' },
  { name: 'Image Compressor', to: '/tool/image-compressor', type: 'image' },
  { name: 'Photo KB Reducer', to: '/tool/photo-kb-reducer', type: 'photo' },
  { name: 'EMI Calculator', to: '/tool/emi-calculator', type: 'calc-purple' },
  { name: 'JSON Formatter', to: '/tool/json-formatter', type: 'code' },
  { name: 'BMI Calculator', to: '/tool/bmi-calculator', type: 'calc-orange' },
  { name: 'Railway Photo Resizer', to: '/tool/railway-photo-resizer', type: 'image' },
  { name: 'SIP Calculator', to: '/tool/sip-calculator', type: 'calc-green' },
];

function getQuickLinkIcon(type) {
  switch (type) {
    case 'pdf':
      return <FileText className="w-3.5 h-3.5 text-[#ef4444] mr-1.5 shrink-0" />;
    case 'image':
      return <ImageIcon className="w-3.5 h-3.5 text-[#3b82f6] mr-1.5 shrink-0" />;
    case 'photo':
      return <Camera className="w-3.5 h-3.5 text-[#6366f1] mr-1.5 shrink-0" />;
    case 'calc-purple':
      return <Calculator className="w-3.5 h-3.5 text-[#8b5cf6] mr-1.5 shrink-0" />;
    case 'code':
      return <Code2 className="w-3.5 h-3.5 text-[#475569] mr-1.5 shrink-0" />;
    case 'calc-orange':
      return <Calculator className="w-3.5 h-3.5 text-[#f97316] mr-1.5 shrink-0" />;
    case 'calc-green':
      return <Calculator className="w-3.5 h-3.5 text-[#10b981] mr-1.5 shrink-0" />;
    default:
      return null;
  }
}

export default function HeroSection({ toolCount }) {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const handleSearch = (event) => {
    event.preventDefault();
    if (search.trim()) {
      router.push(`/tools?q=${encodeURIComponent(search)}`);
    }
  };

  return (
    <section className="relative overflow-hidden py-12 sm:py-20 lg:py-24 bg-gradient-to-b from-background/50 to-background border-b border-border/40">
      <div className="absolute inset-0 hero-grid-pattern pointer-events-none" />
      <div className="hidden lg:block absolute top-10 left-[8%] w-72 h-72 rounded-full bg-primary/8 blur-3xl animate-float pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column - Copy & Controls */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10 dark:fill-indigo-400/10" />
              <span>{toolCount}+ free tools for common online tasks</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-foreground leading-[1.15] mb-6">
              Free online tools <br />
              <span className="text-[#6366f1]">for everyday work</span>
            </h1>

            {/* Description */}
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
              Use QuickUtils for PDFs, images, calculators, text, developer tasks,
              SEO checks, exam documents, seller tools, and shipping estimates.
            </p>

            {/* Wide Rounded Search Form */}
            <form onSubmit={handleSearch} className="w-full max-w-xl mb-8">
              <div className="relative flex items-center bg-card rounded-full border border-border shadow-md focus-within:shadow-lg focus-within:border-primary/50 transition-all duration-300 px-4 py-2">
                <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search for any tool..."
                  aria-label="Search QuickUtils tools"
                  className="w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-base py-1.5 focus:ring-0 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Search tools"
                  className="ml-2 w-10 h-10 rounded-full bg-[#4f46e5] hover:bg-[#4338ca] text-white flex items-center justify-center transition-colors shrink-0 shadow-sm"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Quick Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.name}
                  type="button"
                  onClick={() => router.push(link.to)}
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all shadow-sm font-medium"
                >
                  {getQuickLinkIcon(link.type)}
                  <span>{link.name}</span>
                </button>
              ))}
              <Link
                href="/tools"
                className="inline-flex items-center text-xs font-bold text-[#6366f1] hover:text-[#4f46e5] ml-1 transition-colors group"
              >
                <span>View all tools</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            
          </div>

          {/* Right Column - Hero Graphic */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="relative w-full max-w-[480px] lg:max-w-none rounded-[1.75rem] overflow-hidden border border-border shadow-xl animate-float">
              <img
                src="/Home.png"
                alt="QuickUtils Hero Graphics"
                className="w-full h-auto object-contain bg-transparent"
              />
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
