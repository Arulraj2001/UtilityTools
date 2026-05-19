import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Sparkles, ArrowRight, Shield, Zap, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const QUICK_LINKS = ['EMI Calculator', 'Compress PDF', 'BMI Calc', 'Railway Photo', 'Bank Photo', 'SIP Calc', 'Resizer', 'Exam'];

export default function HeroSection({ toolCount }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/tools?q=${encodeURIComponent(search)}`);
  };

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg mt-5" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute top-20 left-[10%] w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-0 right-[5%] w-96 h-96 bg-accent/8 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}>
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 shadow-sm">
            
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{toolCount}+ Free Tools — No Sign Up Required</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            All-in-one
            <br />
            <span className="gradient-text">utility platform</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            PDF tools, image converters, calculators, text utilities and developer tools — 
            all free, all instant, all in one place.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-card rounded-2xl border border-border shadow-lg hover:shadow-xl transition-shadow premium-card panel-highlight">
                <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for any tool..."
                  className="border-0 focus-visible:ring-0 text-base h-13 bg-transparent py-3.5" />
                
                <Button type="submit" className="mr-1.5 rounded-xl h-9 px-5 bg-primary hover:bg-primary/90 shadow-sm">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {QUICK_LINKS.map((link) =>
            <button
              key={link}
              onClick={() => navigate(`/tools?q=${encodeURIComponent(link)}`)}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors motion-safe:transform-gpu motion-safe:transition-transform hover:scale-[1.02] active:scale-95">
              {link}
            </button>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Instant, client-side processing</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-500" />
              <span>Files never leave your device</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>100% free, forever</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>);

}