import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getToolContentProfile } from './toolContentProfiles';

export default function ToolContentSections({ tool }) {

  if (!tool) return null;

  const profile = getToolContentProfile(tool.slug);

  if (profile) {
    return <PhaseToolContent profile={profile} />;
  }

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

  // Generate rich default content sections (500+ words)
  return (
    <div className="space-y-8 mt-8">

      {/* ============== WHAT IS THIS TOOL ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
      >
        <h2 className="text-2xl font-bold mb-4">What is {tool.name}?</h2>
        
        <div className="space-y-4 text-muted-foreground leading-7">
          <p>
            <strong>{tool.name}</strong> is a powerful online utility tool designed to help you {tool.description || 'accomplish your tasks efficiently'}. Whether you're a creative professional, developer, student, or business user, this tool streamlines your workflow and saves valuable time.
          </p>
          
          <p>
            {tool.name} works directly in your browser, meaning there's no software to install, no complicated setup process, and no learning curve. Simply upload your content, configure your preferences, and get instant results. The tool is optimized for speed, reliability, and user-friendly operation.
          </p>

          <div className="mt-4">
            <h3 className="font-semibold text-foreground mb-3">Key Benefits:</h3>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong>Free & Accessible:</strong> No signup required, works on any device with a browser</li>
              <li><strong>Fast Processing:</strong> Instant results with optimized performance</li>
              <li><strong>Secure & Private:</strong> Your data is processed securely with no tracking</li>
              <li><strong>User-Friendly:</strong> Intuitive interface designed for all skill levels</li>
              <li><strong>Professional Quality:</strong> Production-grade results suitable for business use</li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* ============== HOW TO USE STEP BY STEP ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
      >
        <h2 className="text-2xl font-bold mb-4">How to Use {tool.name} - Step by Step</h2>
        
        <ol className="space-y-4">
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm">1</span>
            <div>
              <h3 className="font-semibold text-foreground">Access the Tool</h3>
              <p className="text-muted-foreground text-sm mt-1">Open {tool.name} in your browser. No account or login is required to get started immediately.</p>
            </div>
          </li>
          
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm">2</span>
            <div>
              <h3 className="font-semibold text-foreground">Prepare Your Input</h3>
              <p className="text-muted-foreground text-sm mt-1">Upload your file or paste your content. Make sure your input is in the correct format and free of errors for best results.</p>
            </div>
          </li>
          
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <div>
              <h3 className="font-semibold text-foreground">Configure Settings (Optional)</h3>
              <p className="text-muted-foreground text-sm mt-1">Adjust any available settings or options to customize the processing for your specific needs. Default settings work great for most use cases.</p>
            </div>
          </li>
          
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm">4</span>
            <div>
              <h3 className="font-semibold text-foreground">Process Your Content</h3>
              <p className="text-muted-foreground text-sm mt-1">Click the main action button to process your input. Processing is typically very fast, with results displayed instantly.</p>
            </div>
          </li>
          
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm">5</span>
            <div>
              <h3 className="font-semibold text-foreground">Download or Copy Results</h3>
              <p className="text-muted-foreground text-sm mt-1">Preview your results and either download the file or copy the content to your clipboard. Results are ready for immediate use.</p>
            </div>
          </li>
        </ol>
      </motion.section>

      {/* ============== REAL WORLD USE CASES ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
      >
        <h2 className="text-2xl font-bold mb-4">Real-World Use Cases</h2>
        
        <div className="space-y-4">
          <div className="pl-4 border-l-2 border-primary/30">
            <h3 className="font-semibold text-foreground">For Content Creators</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Streamline your content workflow by automating repetitive tasks. Create more engaging content in less time while maintaining professional quality standards.
            </p>
          </div>

          <div className="pl-4 border-l-2 border-primary/30">
            <h3 className="font-semibold text-foreground">For Developers</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Integrate {tool.name} into your development workflow to handle specific tasks without building custom solutions. Save development time and focus on core features.
            </p>
          </div>

          <div className="pl-4 border-l-2 border-primary/30">
            <h3 className="font-semibold text-foreground">For Students & Educators</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Perfect for learning and teaching purposes. Students can use it to complete assignments efficiently while understanding the underlying processes.
            </p>
          </div>

          <div className="pl-4 border-l-2 border-primary/30">
            <h3 className="font-semibold text-foreground">For Business Professionals</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Improve productivity and reduce manual work. Process bulk operations, automate routine tasks, and focus on strategic decision-making instead.
            </p>
          </div>

          <div className="pl-4 border-l-2 border-primary/30">
            <h3 className="font-semibold text-foreground">For Entrepreneurs & Startups</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Cost-effective solution for businesses of any size. Eliminate the need for expensive software by using free, reliable, browser-based tools.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ============== TIPS & BEST PRACTICES ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
      >
        <h2 className="text-2xl font-bold mb-4">Pro Tips & Best Practices</h2>
        
        <ul className="space-y-3 list-disc pl-5 text-muted-foreground">
          <li><strong>Verify Input Quality:</strong> Always double-check your input before processing to ensure accuracy and prevent errors in the output.</li>
          <li><strong>Optimize File Sizes:</strong> For faster processing, use optimized file sizes. Compress large files when possible without compromising quality.</li>
          <li><strong>Review Results Carefully:</strong> Always review the generated output before using it. Make any necessary adjustments or refinements as needed.</li>
          <li><strong>Keep Backups:</strong> Save copies of your original files before making changes using any processing tool.</li>
          <li><strong>Use Related Tools:</strong> Explore other tools in our collection for a complete workflow solution and maximum efficiency.</li>
          <li><strong>Bookmark for Quick Access:</strong> Save {tool.name} to your bookmarks for quick access whenever you need it.</li>
          <li><strong>Try Different Settings:</strong> Experiment with different configuration options to find what works best for your specific use case.</li>
        </ul>
      </motion.section>

      {/* ============== FAQ SECTION ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
      >
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">Is {tool.name} really free?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Yes, {tool.name} is completely free to use. There are no hidden fees, no subscription requirements, and no payment information needed. Simply access it in your browser and start using it immediately.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Do I need to create an account?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              No account is required. {tool.name} is designed to work instantly without any signup process. You can start using it right away without providing any personal information.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Is my data secure and private?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Your privacy is important to us. {tool.name} processes your data securely, and we do not store your uploads or track your activity. Your files are processed safely and then deleted.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">What browsers does it support?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              {tool.name} works on all modern browsers including Chrome, Firefox, Safari, and Edge. It's optimized for both desktop and mobile devices for maximum compatibility.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Are there any limitations?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              {tool.name} is designed for typical use cases. While there may be practical limits on file size or processing complexity, the tool handles the vast majority of real-world scenarios efficiently.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Can I use this for commercial purposes?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Yes, you can use {tool.name} for commercial projects and business purposes. The tool is designed to support professional use cases and business workflows.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">What if I encounter an issue?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              If you experience any problems, try refreshing the page, clearing your browser cache, or using a different browser. For persistent issues, contact our support team through the contact page.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ============== KEYWORDS/RELATED SEARCHES ============== */}
      {(tool.primary_keywords || tool.secondary_keywords || tool.seo_keywords) && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
        >
          <h2 className="text-2xl font-bold mb-6">Search Terms & Keywords</h2>
          
          <div className="space-y-6">
            {/* Primary Keywords */}
            {tool.primary_keywords && (
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Primary Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {tool.primary_keywords
                    .split(',')
                    .map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                      >
                        {keyword.trim()}
                      </span>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Main target keywords for this tool</p>
              </div>
            )}

            {/* Secondary Keywords */}
            {tool.secondary_keywords && (
              <div>
                <h3 className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">Secondary Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {tool.secondary_keywords
                    .split(',')
                    .map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors"
                      >
                        {keyword.trim()}
                      </span>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Related search terms</p>
              </div>
            )}

            {/* Legacy Keywords (seo_keywords) */}
            {tool.seo_keywords && !tool.primary_keywords && !tool.secondary_keywords && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">Related Search Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {tool.seo_keywords
                    .split(',')
                    .slice(0, 15)
                    .map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        {keyword.trim()}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-muted-foreground text-sm mt-6">
            {tool.name} is commonly searched using these keywords and phrases. If you're looking for related functionality, explore our collection of tools for comprehensive solutions.
          </p>
        </motion.section>
      )}

    </div>
  );
}

function PhaseToolContent({ profile }) {
  return (
    <div className="space-y-6 mt-8">
      <ToolSection>
        <p className="text-base leading-7 text-muted-foreground">{profile.intro}</p>
      </ToolSection>

      <ToolSection title="How to use this tool">
        <ol className="space-y-3">
          {profile.howTo.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6 text-muted-foreground">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </ToolSection>

      <ToolSection title={profile.explanation.heading}>
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          {profile.explanation.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {profile.explanation.formula && (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-sm text-foreground">
              {profile.explanation.formula}
            </div>
          )}
        </div>
      </ToolSection>

      <ToolSection title="Real examples">
        <div className="space-y-5">
          {profile.examples.map((example) => (
            <ExampleBlock key={example.title} example={example} />
          ))}
        </div>
      </ToolSection>

      <ToolSection title="Tips and common mistakes">
        <ul className="grid gap-3 sm:grid-cols-2">
          {profile.tips.map((tip) => (
            <li key={tip} className="rounded-xl border border-border/50 bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
              {tip}
            </li>
          ))}
        </ul>
      </ToolSection>

      <ToolSection title="Limitations and disclaimer">
        <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
          {profile.disclaimer.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ToolSection>

      <ToolSection title="Frequently asked questions">
        <div className="space-y-4">
          {profile.faqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </ToolSection>

      <ToolSection title="Related tools">
        <div className="grid gap-3 sm:grid-cols-2">
          {profile.relatedTools.map((related) => (
            <Link
              key={related.slug}
              to={`/tool/${related.slug}`}
              className="rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="text-sm font-semibold text-foreground">{related.label}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{related.description}</span>
            </Link>
          ))}
        </div>
      </ToolSection>

      <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
    </div>
  );
}

function ToolSection({ title, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
    >
      {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
      {children}
    </motion.section>
  );
}

function ExampleBlock({ example }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
      <h3 className="text-base font-semibold text-foreground">{example.title}</h3>
      {example.body && <p className="mt-2 text-sm leading-6 text-muted-foreground">{example.body}</p>}
      {example.table && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                {example.table.headers.map((header) => (
                  <th key={header} className="border border-border/60 bg-background px-3 py-2 text-left font-semibold text-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {example.table.rows.map((row) => (
                <tr key={row.join('-')}>
                  {row.map((cell) => (
                    <td key={cell} className="border border-border/60 px-3 py-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {example.items && (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          {example.items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {example.result && (
        <p className="mt-4 rounded-lg bg-background px-3 py-2 text-sm font-medium text-foreground">
          {example.result}
        </p>
      )}
    </div>
  );
}
