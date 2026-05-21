import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Scale,
  FileText,
  AlertTriangle,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function Terms() {
  const sections = [
    {
      icon: ShieldCheck,
      title: 'Acceptable Use',
      content: (
        <>
          <p>
            QuickUtils is designed to help with everyday productivity tasks such as
            PDF editing, image optimization, file conversion, calculators, and exam-related tools.
          </p>

          <p>
            Please use the platform responsibly and legally.
            Do not misuse the website, attempt to harm the service,
            upload malicious files, or interfere with other users.
          </p>

          <p>
            If you upload files or content, make sure you have the right to use them.
          </p>
        </>
      ),
    },

    {
      icon: FileText,
      title: 'Your Responsibility',
      content: (
        <>
          <p>
            You are responsible for the files, information, and content you upload or process using QuickUtils.
          </p>

          <p>
            While we aim to provide reliable outputs, we recommend double-checking important files,
            especially for official, educational, legal, or professional use.
          </p>

          <p>
            If account or admin features are available, please keep your credentials secure.
          </p>
        </>
      ),
    },

    {
      icon: AlertTriangle,
      title: 'No Guarantees',
      content: (
        <>
          <p>
            We work continuously to keep QuickUtils fast, stable, and accurate,
            but we cannot guarantee uninterrupted availability or perfect results in every situation.
          </p>

          <p>
            Tools are provided on an “as is” and “as available” basis.
            Some outputs may vary depending on browser support, file quality, or device limitations.
          </p>
        </>
      ),
    },

    {
      icon: Scale,
      title: 'Limitation of Liability',
      content: (
        <>
          <p>
            QuickUtils is not responsible for indirect losses, damaged files,
            data loss, or issues caused by the use of generated outputs.
          </p>

          <p>
            Users should independently verify important documents, images, or conversions before relying on them.
          </p>
        </>
      ),
    },

    {
      icon: Lock,
      title: 'Intellectual Property',
      content: (
        <>
          <p>
            The QuickUtils website, branding, design, content, and code are protected by applicable intellectual property laws.
          </p>

          <p>
            You may use the tools for personal, educational, or internal business use,
            but you may not copy, resell, or redistribute website content without permission.
          </p>
        </>
      ),
    },

    {
      icon: RefreshCw,
      title: 'Service Changes',
      content: (
        <>
          <p>
            We may improve, modify, remove, or update tools and features at any time as the platform evolves.
          </p>

          <p>
            Continued use of QuickUtils after updates means you agree to the latest version of these terms.
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
              Terms & Guidelines
            </div>

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg border border-border/40">
              <FileText className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Terms of Service
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              These terms explain how QuickUtils can be used responsibly and what users should expect while using the platform and its tools.
            </p>

            <p className="text-sm text-muted-foreground mt-5">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Intro Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-10 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-6 shadow-xl"
          >
            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Simple and fair usage
                </h2>

                <p className="text-muted-foreground leading-relaxed">
                  Our goal is to keep QuickUtils simple, useful, and accessible for everyone.
                  These guidelines help maintain a safe and reliable experience for all users.
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
              If you have questions about these terms or how QuickUtils works,
              please contact us through the contact page.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}