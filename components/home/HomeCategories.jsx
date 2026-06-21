'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Image, Calculator, Type, Code2 } from 'lucide-react';

const CATEGORY_CONFIGS = {
  'pdf-tools': {
    name: 'PDF Tools',
    desc: 'Convert, compress, merge, split and edit PDF files with ease.',
    btnText: 'Explore PDF Tools',
    iconColor: 'text-[#ef4444] dark:text-red-400',
    bgColor: 'bg-[#fef2f2] dark:bg-red-950/20',
    borderColor: 'border-[#fee2e2] dark:border-red-900/20 hover:border-[#fca5a5] dark:hover:border-red-800/40',
    btnColor: 'bg-[#fef2f2] dark:bg-red-950/30 text-[#991b1b] dark:text-red-300 hover:bg-[#fee2e2] dark:hover:bg-red-900/30',
    icon: FileText,
  },
  'image-tools': {
    name: 'Image Tools',
    desc: 'Compress, convert, resize and optimize images in seconds.',
    btnText: 'Explore Image Tools',
    iconColor: 'text-[#3b82f6] dark:text-blue-400',
    bgColor: 'bg-[#eff6ff] dark:bg-blue-950/20',
    borderColor: 'border-[#dbeafe] dark:border-blue-900/20 hover:border-[#93c5fd] dark:hover:border-blue-800/40',
    btnColor: 'bg-[#eff6ff] dark:bg-blue-950/30 text-[#2563eb] dark:text-blue-400 hover:bg-[#dbeafe] dark:hover:bg-blue-900/30',
    icon: Image,
  },
  'finance': {
    name: 'Calculators',
    desc: 'EMI, BMI, SIP and more everyday calculators.',
    btnText: 'Explore Calculators',
    iconColor: 'text-[#8b5cf6] dark:text-purple-400',
    bgColor: 'bg-[#faf5ff] dark:bg-purple-950/20',
    borderColor: 'border-[#f3e8ff] dark:border-purple-900/20 hover:border-[#c084fc] dark:hover:border-purple-800/40',
    btnColor: 'bg-[#faf5ff] dark:bg-purple-950/30 text-[#7c3aed] dark:text-purple-400 hover:bg-[#f3e8ff] dark:hover:bg-purple-900/30',
    icon: Calculator,
  },
  'text-tools': {
    name: 'Text Tools',
    desc: 'Count, convert, format and transform your text easily.',
    btnText: 'Explore Text Tools',
    iconColor: 'text-[#10b981] dark:text-emerald-400',
    bgColor: 'bg-[#f0fdf4] dark:bg-emerald-950/20',
    borderColor: 'border-[#dcfce7] dark:border-emerald-900/20 hover:border-[#6ee7b7] dark:hover:border-emerald-800/40',
    btnColor: 'bg-[#f0fdf4] dark:bg-emerald-950/30 text-[#166534] dark:text-emerald-300 hover:bg-[#dcfce7] dark:hover:bg-emerald-900/30',
    icon: Type,
  },
  'developer-tools': {
    name: 'Developer Tools',
    desc: 'Format, validate, minify and speed up your workflow.',
    btnText: 'Explore Developer Tools',
    iconColor: 'text-[#6366f1] dark:text-indigo-400',
    bgColor: 'bg-[#f5f3ff] dark:bg-indigo-950/20',
    borderColor: 'border-[#e0e7ff] dark:border-indigo-900/20 hover:border-[#a5b4fc] dark:hover:border-indigo-800/40',
    btnColor: 'bg-[#f5f3ff] dark:bg-indigo-950/30 text-[#4f46e5] dark:text-indigo-400 hover:bg-[#e0e7ff] dark:hover:bg-indigo-900/30',
    icon: Code2,
  },
};

export default function HomeCategories({ categories = [] }) {
  const displayCategories = categories.map(cat => {
    const config = CATEGORY_CONFIGS[cat.slug] || {
      name: cat.name,
      desc: cat.description || `Focused QuickUtils tools for ${cat.name.toLowerCase()} tasks.`,
      btnText: `Explore ${cat.name}`,
      iconColor: 'text-indigo-500 dark:text-indigo-400',
      bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      borderColor: 'border-indigo-100 dark:border-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800/40',
      btnColor: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
      icon: Code2,
    };
    return {
      ...cat,
      displayName: config.name,
      displayDesc: config.desc,
      btnText: config.btnText,
      iconColor: config.iconColor,
      bgColor: config.bgColor,
      borderColor: config.borderColor,
      btnColor: config.btnColor,
      icon: config.icon,
    };
  });

  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Explore tools by category
          </h2>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Everything you need to get work done faster and smarter.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {displayCategories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id || cat.slug}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`flex flex-col h-full rounded-xl border ${cat.borderColor} bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300`}>
                  <div className={`w-9 h-9 rounded-lg ${cat.bgColor} flex items-center justify-center mb-3.5 shrink-0`}>
                    <Icon className={`w-5 h-5 ${cat.iconColor}`} />
                  </div>
                  
                  <h3 className="font-bold text-[15px] text-card-foreground mb-1.5 leading-snug">
                    {cat.displayName}
                  </h3>
                  
                  <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">
                    {cat.displayDesc}
                  </p>
                  
                  <Link
                    href={`/category/${encodeURIComponent(cat.slug)}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className={`inline-flex items-center justify-center gap-1 w-full py-2 px-3 rounded-lg text-[10.5px] font-bold leading-none ${cat.btnColor} transition-colors duration-200`}
                  >
                    <span>{cat.btnText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
