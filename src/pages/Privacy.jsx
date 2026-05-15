import React from 'react';
import { motion } from 'framer-motion';

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-6">
          Privacy Policy
        </h1>

        <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert text-muted-foreground space-y-6">
          <p className="text-sm">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <p>
            Your privacy is important to us. This website is built to provide
            free online utility tools such as PDF tools, image tools,
            government exam tools, calculators, converters, and other helpful
            web utilities while keeping your data as safe as possible.
          </p>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              1. Files & Data Processing
            </h2>

            <p>
              Most tools on this website process files directly inside your
              browser whenever possible. This means your uploaded images,
              PDFs, signatures, documents, or other files are usually not
              stored on our servers.
            </p>

            <p>
              We do not permanently save your uploaded files, generated
              results, or personal documents.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              2. Information We May Collect
            </h2>

            <p>
              We may collect limited non-personal information such as:
            </p>

            <ul>
              <li>Browser type and device information</li>
              <li>Pages visited and tools used</li>
              <li>Anonymous analytics data</li>
              <li>Performance and error logs</li>
            </ul>

            <p>
              This information helps us improve website performance, user
              experience, and tool quality.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              3. Cookies
            </h2>

            <p>
              This website may use cookies and similar technologies to:
            </p>

            <ul>
              <li>Remember preferences</li>
              <li>Improve loading performance</li>
              <li>Analyze traffic and usage</li>
              <li>Provide personalized content and advertisements</li>
            </ul>

            <p>
              You can disable cookies anytime through your browser settings.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              4. Advertising
            </h2>

            <p>
              We may display advertisements through services such as Google
              AdSense or other advertising partners.
            </p>

            <p>
              These services may use cookies to show relevant ads based on
              your interests and browsing activity.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              5. Third-Party Services
            </h2>

            <p>
              Some features of this website may use trusted third-party
              services including analytics, authentication, hosting, or AI
              processing tools.
            </p>

            <p>
              These providers may process limited technical information
              necessary for their services to function properly.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              6. Data Security
            </h2>

            <p>
              We take reasonable measures to keep the website secure and
              protect user data. All connections are encrypted using HTTPS.
            </p>

            <p>
              However, no online service can guarantee 100% security, so users
              should avoid uploading highly confidential information.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              7. Children's Privacy
            </h2>

            <p>
              This website is not intended for children under 13 years of age.
              We do not knowingly collect personal information from children.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              8. Changes to This Policy
            </h2>

            <p>
              We may update this Privacy Policy from time to time to reflect
              improvements, legal requirements, or changes to our services.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              9. Contact Us
            </h2>

            <p>
              If you have any questions regarding this Privacy Policy or the
              website, please contact us through the contact page or support
              section.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}