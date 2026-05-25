import React from 'react';
import { motion } from 'framer-motion';
import {
  Wrench,
  Zap,
  Shield,
  Heart,
  Rocket,
  Sparkles,
  Globe,
  Code2,
  Lightbulb,
} from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: Wrench,
      title: 'Practical Utility Tools',
      desc: 'Built to solve real everyday problems like PDF compression, image resizing, file conversion, and exam document preparation.',
    },

    {
      icon: Zap,
      title: 'Fast Browser Experience',
      desc: 'Many tools work directly inside the browser for faster processing and a smoother mobile-friendly experience.',
    },

    {
      icon: Shield,
      title: 'Privacy-Focused',
      desc: 'Whenever possible, files stay on your device instead of being permanently stored on external servers.',
    },

    {
      icon: Heart,
      title: 'Made for Real Users',
      desc: 'Designed for students, creators, freelancers, job seekers, and anyone who needs simple digital tools quickly.',
    },
  ];

  const timeline = [
    {
      year: 'Started',
      title: 'Exploring Web Development',
      desc: 'Started learning frontend development, UI building, and browser-based utility tools with a strong focus on practical problem solving.',
      icon: Code2,
    },

    {
      year: 'Growth',
      title: 'Building Productivity Tools',
      desc: 'Created tools focused on image editing, PDF workflows, calculators, and utilities that simplify everyday digital tasks.',
      icon: Lightbulb,
    },

    {
      year: 'Now',
      title: 'Building QuickUtils',
      desc: 'QuickUtils continues to grow as a fast, privacy-friendly utility platform designed for students, creators, exam applicants, and professionals.',
      icon: Rocket,
    },
  ];

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
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4" />
              About QuickUtils
            </div>

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg border border-border/40">
              <Globe className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
              Built to make everyday digital tasks easier
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              QuickUtils is a growing collection of fast, practical, browser-based tools
              designed to help people solve common digital problems without complicated software.
              From PDF compression and image resizing to exam photo tools and productivity utilities,
              the goal is simple — useful tools that just work.
            </p>
          </div>

          {/* Intro Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden p-6 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl premium-card panel-highlight"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.04] pointer-events-none" />

                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>

                <h3 className="font-semibold text-lg mb-2">
                  {f.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Main Story */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-7 sm:p-8 shadow-xl mb-14"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-primary" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-3">
                  Why QuickUtils exists
                </h2>

                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Many utility websites today feel overloaded, confusing, or filled with unnecessary distractions.
                    QuickUtils was created with a different approach — clean tools, practical workflows,
                    and a faster experience focused on getting things done quickly.
                  </p>

                  <p>
                    The platform especially focuses on real-world needs like:
                    PDF editing, image compression, passport photo preparation,
                    government exam uploads, calculators, productivity workflows,
                    and simple browser-based utilities that save time.
                  </p>

                  <p>
                    A strong focus is also placed on mobile usability, lightweight performance,
                    and privacy-friendly browser-side processing whenever possible.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Timeline */}
          <div className="mb-14">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">
                Journey & Growth
              </h2>

              <p className="text-muted-foreground max-w-2xl mx-auto">
                QuickUtils continues evolving step by step with better tools,
                cleaner workflows, and more practical features focused on real users.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden sm:block" />

              <div className="space-y-8">
                {timeline.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative flex gap-5"
                    >
                      <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center border border-border/50 shrink-0 z-10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>

                      <div className="flex-1 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 shadow-xl">
                        <div className="text-sm text-primary font-medium mb-2">
                          {item.year}
                        </div>

                        <h3 className="text-xl font-semibold mb-2">
                          {item.title}
                        </h3>

                        <p className="text-muted-foreground leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/10 p-8 shadow-xl">
              <h2 className="text-2xl font-semibold mb-3">
                Still growing, improving, and building
              </h2>

              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                QuickUtils continues to expand with better tools, workflows, SEO guides,
                exam utilities, and productivity features designed to help people save time
                and simplify everyday digital work.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}