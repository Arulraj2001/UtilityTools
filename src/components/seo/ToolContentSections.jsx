import React from 'react';
import { motion } from 'framer-motion';

export default function ToolContentSections({ tool }) {

  if (!tool) return null;

  // If custom seo_content exists, render it
  if (tool.seo_content) {
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

  // Fallback: Generic content sections
  return (
    <div
      className="
        space-y-6
        mt-8
      "
    >

      {/* How To Use */}
      <section
        className="
          rounded-2xl
          border border-border/50
          bg-card
          p-5 sm:p-6
        "
      >

        <h2
          className="
            text-xl
            font-bold
            mb-4
          "
        >
          How to Use {tool.name}
        </h2>

        <ol
          className="
            space-y-3
            list-decimal
            pl-5
            text-muted-foreground
          "
        >

          <li>
            Open the {tool.name} tool.
          </li>

          <li>
            Enter or upload your required input.
          </li>

          <li>
            Configure settings if needed.
          </li>

          <li>
            Click the action button to process.
          </li>

          <li>
            Copy or download the final result.
          </li>

        </ol>

      </section>

      {/* Why Use */}
      <section
        className="
          rounded-2xl
          border border-border/50
          bg-card
          p-5 sm:p-6
        "
      >

        <h2
          className="
            text-xl
            font-bold
            mb-4
          "
        >
          Why Use {tool.name}?
        </h2>

        <p
          className="
            text-muted-foreground
            leading-7
          "
        >

          {tool.name} helps creators,
          developers, marketers,
          students, and professionals
          save time and improve workflow
          efficiency using fast,
          browser-based utilities.

        </p>

      </section>

      {/* Best Practices */}
      <section
        className="
          rounded-2xl
          border border-border/50
          bg-card
          p-5 sm:p-6
        "
      >

        <h2
          className="
            text-xl
            font-bold
            mb-4
          "
        >
          Best Practices
        </h2>

        <ul
          className="
            space-y-3
            list-disc
            pl-5
            text-muted-foreground
          "
        >

          <li>
            Double-check your input before processing.
          </li>

          <li>
            Use optimized file sizes for faster performance.
          </li>

          <li>
            Review generated output carefully.
          </li>

          <li>
            Use related tools for better workflow efficiency.
          </li>

        </ul>

      </section>

      {/* Related Searches */}
      <section
        className="
          rounded-2xl
          border border-border/50
          bg-card
          p-5 sm:p-6
        "
      >

        <h2
          className="
            text-xl
            font-bold
            mb-4
          "
        >
          Related Searches
        </h2>

        <div
          className="
            flex
            flex-wrap
            gap-2
          "
        >

          {(tool.seo_keywords || '')
            .split(',')
            .slice(0, 12)
            .map((keyword) => (

              <span
                key={keyword}
                className="
                  px-3
                  py-2
                  rounded-xl
                  bg-primary/10
                  text-primary
                  text-sm
                "
              >
                {keyword.trim()}
              </span>

            ))}

        </div>

      </section>

    </div>
  );
}