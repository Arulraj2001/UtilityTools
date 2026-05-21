import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Cookie,
  FileText,
  Sparkles,
} from 'lucide-react';

export default function Privacy() {
  const sections = [
    {
      icon: Lock,
      title: 'Files and Browser-Side Processing',
      content: (
        <>
          <p>
            Many tools on QuickUtils work directly inside your browser. 
            When browser-side processing is supported, your files stay on your device 
            and are not permanently uploaded or stored by us.
          </p>

          <p>
            This is especially useful for image tools, PDF utilities, compression tools,
            and document workflows where privacy and speed matter.
          </p>

          <p>
            Some features may temporarily use server-side processing depending on the tool functionality,
            but files are only handled as needed and are not stored longer than necessary.
          </p>
        </>
      ),
    },

    {
      icon: Eye,
      title: 'Information We May Collect',
      content: (
        <>
          <p>
            To improve the platform and maintain reliability, we may collect limited non-personal information such as:
          </p>

          <ul className="list-disc pl-5 space-y-1">
            <li>Browser and device information</li>
            <li>Pages visited and tools used</li>
            <li>Anonymous analytics and usage data</li>
            <li>Error and performance logs</li>
          </ul>

          <p>
            This data helps us improve tool quality, performance, and user experience.
          </p>
        </>
      ),
    },

    {
      icon: Cookie,
      title: 'Cookies and Similar Technologies',
      content: (
        <>
          <p>
            QuickUtils may use cookies and similar technologies to improve website functionality,
            remember preferences, analyze traffic, and support advertising services.
          </p>

          <p>
            You can manage or disable cookies through your browser settings if you prefer.
          </p>
        </>
      ),
    },

    {
      icon: Database,
      title: 'Ads and Third-Party Services',
      content: (
        <>
          <p>
            Some parts of the website may use third-party services such as:
          </p>

          <ul className="list-disc pl-5 space-y-1">
            <li>Google AdSense</li>
            <li>Google Analytics</li>
            <li>Supabase</li>
            <li>Cloud infrastructure providers</li>
          </ul>

          <p>
            These services may use their own cookies or data practices based on their individual privacy policies.
          </p>
        </>
      ),
    },

    {
      icon: ShieldCheck,
      title: 'Data Security',
      content: (
        <>
          <p>
            We use reasonable technical measures to help protect the website and improve security.
            Connections to QuickUtils are encrypted using HTTPS.
          </p>

          <p>
            While we work to keep the platform secure, no online system can guarantee complete security,
            so please avoid uploading highly sensitive information unless necessary.
          </p>
        </>
      ),
    },

    {
      icon: FileText,
      title: 'Policy Updates',
      content: (
        <>
          <p>
            This Privacy Policy may be updated occasionally as the platform evolves,
            new tools are added, or legal requirements change.
          </p>

          <p>
            When updates happen, the latest revision date will appear at the top of this page.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-primary/10 blur-3xl rounded-full -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-violet-500/10 blur-3xl rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4" />
              Privacy & Transparency
            </div>

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg border border-border/40">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Privacy Policy
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              We believe utility tools should be simple, fast, and respectful of your privacy.
              This page explains how QuickUtils handles files, analytics, and data in a clear and transparent way.
            </p>

            <p className="text-sm text-muted-foreground mt-5">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Highlight Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-10 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 shadow-xl"
          >
            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-emerald-500" />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Privacy-first browser tools
                </h2>

                <p className="text-muted-foreground leading-relaxed">
                  Many QuickUtils tools process files directly inside your browser whenever possible.
                  This helps improve privacy, speed, and responsiveness while reducing unnecessary uploads.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => {
              const Icon = section.icon;

              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  <div className="text-muted-foreground leading-relaxed space-y-4">
                    {section.content}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-10 text-center"
          >
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              If you have questions about this Privacy Policy or how QuickUtils handles data,
              please use the contact page to get in touch.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}