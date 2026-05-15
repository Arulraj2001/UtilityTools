import React from 'react';
import { motion } from 'framer-motion';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose prose-sm max-w-none dark:prose-invert space-y-4 text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="text-foreground font-semibold text-lg">1. Acceptance of Terms</h2>
          <p>By using ToolHub, you agree to these terms of service. If you do not agree, please do not use our services.</p>
          <h2 className="text-foreground font-semibold text-lg">2. Use of Services</h2>
          <p>Our tools are provided "as is" for informational and utility purposes. Results should be verified independently for critical applications.</p>
          <h2 className="text-foreground font-semibold text-lg">3. Limitation of Liability</h2>
          <p>ToolHub is not liable for any damages or losses resulting from the use of our tools. Use at your own discretion.</p>
          <h2 className="text-foreground font-semibold text-lg">4. Intellectual Property</h2>
          <p>All content and design elements on this site are protected by copyright. You may not reproduce or distribute them without permission.</p>
          <h2 className="text-foreground font-semibold text-lg">5. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the site constitutes acceptance of the updated terms.</p>
        </div>
      </motion.div>
    </div>
  );
}