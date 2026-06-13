import React from 'react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { motion } from 'framer-motion';
import {
  buildToolFaqItems,
  getToolHowToSteps,
  getToolUseCases,
  shouldAddToolFallbackContent,
} from '@/lib/toolContentFallbacks';

export default function ToolContentSections({ tool, categoryName }) {
  if (!tool) return null;

  const shouldAddFallback = shouldAddToolFallbackContent(tool);
  const useCases = getToolUseCases(categoryName);
  const steps = getToolHowToSteps(tool);
  const fallbackFaqs = (tool.faq || []).length >= 2 ? [] : buildToolFaqItems(tool, categoryName);
  const inputLabels = (tool.input_fields || [])
    .map((field) => field?.label || field?.name)
    .filter(Boolean)
    .slice(0, 6);

  if (!shouldAddFallback && tool.seo_content) {
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
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(tool.seo_content) }}
      />
    );
  }

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
    >
      {tool.seo_content && (
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(tool.seo_content) }} />
      )}

      <h2>How {tool.name} helps</h2>
      <p>
        {tool.name} is designed for focused {categoryName || 'utility'} work where the
        result needs to be quick, readable, and easy to check. Use it when you want to
        avoid manual calculations, repeated formatting work, or switching between
        multiple apps for a simple task.
      </p>

      <h3>Best use cases</h3>
      <ul>
        {useCases.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3>How to use this tool</h3>
      <ol>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h3>Inputs and output</h3>
      <p>
        The tool uses the information you provide on the page and returns a result in
        the same browser session. Keep your source values or original file available so
        you can compare the output before downloading, copying, or submitting it.
      </p>
      {inputLabels.length > 0 && (
        <ul>
          {inputLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}

      <h3>Accuracy and privacy notes</h3>
      <p>
        QuickUtils tools are built for practical everyday use, but important outputs
        should still be reviewed against official instructions, source documents, bank
        or institution rules, current fees, or application portal requirements. For
        file-based tasks, avoid processing highly sensitive documents unless you have
        reviewed the tool flow and are comfortable using an online utility.
      </p>

      {fallbackFaqs.length > 0 && (
        <>
          <h3>Common questions</h3>
          {fallbackFaqs.map((faq) => (
            <div key={faq.question}>
              <h4>{faq.question}</h4>
              <p>{faq.answer}</p>
            </div>
          ))}
        </>
      )}
    </motion.div>
  );
}
