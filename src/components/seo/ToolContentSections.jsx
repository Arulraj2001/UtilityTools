import React from 'react';
import { motion } from 'framer-motion';

export default function ToolContentSections({ tool }) {
  if (!tool?.seo_content) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="
        rounded-2xl
        border border-border/50
        bg-card
        p-5 sm:p-6
        prose prose-sm
        max-w-none
        dark:prose-invert
      "
      dangerouslySetInnerHTML={{ __html: tool.seo_content }}
    />
  );
}
