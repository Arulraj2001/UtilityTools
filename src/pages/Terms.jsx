import React from 'react';
import { motion } from 'framer-motion';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-6">
          Terms of Service
        </h1>

        <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert text-muted-foreground space-y-6">
          <p className="text-sm">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <p>
            Welcome to our website. By accessing or using our tools and
            services, you agree to follow these Terms of Service. Please read
            them carefully before using the platform.
          </p>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              1. Use of Our Services
            </h2>

            <p>
              Our platform provides online utility tools including PDF tools,
              image tools, converters, calculators, government exam utilities,
              and other web-based services.
            </p>

            <p>
              You agree to use these services only for lawful purposes and in
              a way that does not harm the platform, other users, or third
              parties.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              2. User Responsibility
            </h2>

            <p>
              You are responsible for any files, documents, images, or content
              you upload or process using our tools.
            </p>

            <p>
              Please ensure you have the necessary rights and permissions to
              use any uploaded content.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              3. Tool Accuracy
            </h2>

            <p>
              While we aim to provide reliable and accurate tools, we cannot
              guarantee that all outputs will always be error-free or suitable
              for every situation.
            </p>

            <p>
              Users should independently verify important results before using
              them for official, legal, financial, academic, or professional
              purposes.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              4. File Processing
            </h2>

            <p>
              Many tools process files directly in your browser. We do not
              intentionally store or permanently save user files unless clearly
              stated otherwise.
            </p>

            <p>
              However, users should avoid uploading highly sensitive or
              confidential information online.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              5. Intellectual Property
            </h2>

            <p>
              The website design, branding, content, tool interfaces, and
              custom features are protected by applicable intellectual property
              laws.
            </p>

            <p>
              You may not copy, reproduce, resell, or redistribute website
              content without permission.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              6. Third-Party Services
            </h2>

            <p>
              Some services may rely on trusted third-party providers such as
              hosting platforms, analytics tools, authentication systems,
              advertising networks, or AI-based technologies.
            </p>

            <p>
              We are not responsible for interruptions or issues caused by
              third-party services.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              7. Limitation of Liability
            </h2>

            <p>
              We are not responsible for any direct, indirect, incidental, or
              consequential damages resulting from the use of this website or
              its tools.
            </p>

            <p>
              All services are provided on an “as is” and “as available”
              basis.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              8. Account & Admin Access
            </h2>

            <p>
              If admin or user accounts are provided, users are responsible
              for maintaining the security of their login credentials and
              activities performed under their accounts.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              9. Changes to These Terms
            </h2>

            <p>
              We may update or modify these Terms of Service at any time
              without prior notice. Continued use of the website means you
              accept the updated terms.
            </p>
          </div>

          <div>
            <h2 className="text-foreground font-semibold text-xl mb-2">
              10. Contact
            </h2>

            <p>
              If you have questions regarding these Terms of Service, you may
              contact us through the website’s contact page or support
              section.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}