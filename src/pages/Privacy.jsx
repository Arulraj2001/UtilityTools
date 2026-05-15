import React from 'react';
import { motion } from 'framer-motion';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-sm max-w-none dark:prose-invert space-y-4 text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-foreground font-semibold text-lg">1. Information We Collect</h2>
          <p>ToolHub processes data entirely in your browser. We do not collect, store, or transmit your tool inputs or results to our servers.</p>
          <h2 className="text-foreground font-semibold text-lg">2. Cookies & Analytics</h2>
          <p>We use cookies and analytics services to understand how visitors use our site. This includes Google Analytics and similar services that collect anonymous usage data.</p>
          <h2 className="text-foreground font-semibold text-lg">3. Advertising</h2>
          <p>We display advertisements through Google AdSense and other ad networks. These services may use cookies to serve relevant ads.</p>
          <h2 className="text-foreground font-semibold text-lg">4. Data Security</h2>
          <p>Since we process data client-side, your information never leaves your device. We use HTTPS encryption for all data transmission.</p>
          <h2 className="text-foreground font-semibold text-lg">5. Contact</h2>
          <p>For privacy-related questions, please reach out via our contact page.</p>
        </div>
      </motion.div>
    </div>
  );
}