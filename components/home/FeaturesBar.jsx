'use client';
import React from 'react';
import { Zap, Lock, ShieldCheck, Users } from 'lucide-react';

export default function FeaturesBar() {
  const FEATURES = [
    {
      icon: Zap,
      title: 'Fast & Easy',
      desc: 'Get things done in seconds',
      iconColor: 'text-amber-500 dark:text-amber-400 fill-amber-500/10',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
    },
    {
      icon: Lock,
      title: 'Privacy First',
      desc: 'Your data stays private',
      iconColor: 'text-emerald-500 dark:text-emerald-400 fill-emerald-500/10',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    },
    {
      icon: ShieldCheck,
      title: 'Always Free',
      desc: '100% free, no hidden fees',
      iconColor: 'text-blue-500 dark:text-blue-400 fill-blue-500/10',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
    },
    {
      icon: Users,
      title: 'No Sign Up',
      desc: 'Use tools instantly',
      iconColor: 'text-indigo-500 dark:text-indigo-400 fill-indigo-500/10',
      bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 sm:mb-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 division-x-slate">
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.title}
              className={`flex items-center gap-4 px-2 ${
                idx > 0 ? 'lg:border-l lg:border-border lg:pl-6' : ''
              } ${
                idx % 2 === 1 ? 'sm:border-l sm:border-border sm:pl-6 lg:sm:border-l-0 lg:sm:pl-0 lg:border-l' : ''
              }`}
            >
              <div className={`w-11 h-11 rounded-xl ${feature.bgColor} flex items-center justify-center shrink-0`}>
                <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
              </div>
              <div>
                <h4 className="font-bold text-card-foreground text-sm leading-tight">{feature.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
