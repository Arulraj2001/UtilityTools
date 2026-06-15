'use client';
import Link from 'next/link'
import StaticPageSEO from '@/components/seo/StaticPageSEO'

const toolCategories = [
  {
    name: 'PDF Tools',
    description:
      'Compress, merge, split, reorder, and convert PDF files entirely in your browser — no upload to a server required for most operations.',
  },
  {
    name: 'Image Tools',
    description:
      'Resize, compress, crop, convert, and add watermarks to images, plus check file dimensions and metadata before uploading to a platform.',
  },
  {
    name: 'Calculators',
    description:
      'Estimate EMI payments, SIP returns, BMI, volumetric shipping weight, Amazon seller fees, percentage changes, and dozens of other everyday figures.',
  },
  {
    name: 'Developer and SEO Tools',
    description:
      'Format and validate JSON, encode and decode URLs, generate meta tags, minify text, and inspect page-level SEO details without leaving the browser.',
  },
  {
    name: 'Government Exam Tools',
    description:
      'Resize passport photos and signatures to exact pixel and file-size requirements for UPSC, SSC, banking, and state exam application portals.',
  },
  {
    name: 'Seller and Logistics Tools',
    description:
      'Calculate chargeable weight, estimate courier fees, compare shipping rates, and work out Amazon or Flipkart seller margins and net payouts.',
  },
]

const audiences = [
  {
    heading: 'Students and exam applicants',
    detail:
      'Prepare assignment PDFs, resize passport photos and signatures to portal specifications, compress documents under the required file-size limit, and calculate grades or percentages quickly.',
  },
  {
    heading: 'Job seekers',
    detail:
      'Resize application photos to exact dimensions, compress CVs and certificates to email-friendly sizes, and convert documents to the format an employer or portal requires.',
  },
  {
    heading: 'Developers and SEO professionals',
    detail:
      'Format and validate JSON payloads, encode query strings, generate open-graph and meta tags, and run quick checks on URLs without switching tools or writing one-off scripts.',
  },
  {
    heading: 'Online sellers',
    detail:
      'Calculate Amazon and Flipkart fee breakdowns, estimate volumetric chargeable weight for courier billing, and compare net payouts across shipping options before listing a product.',
  },
  {
    heading: 'Office workers and freelancers',
    detail:
      'Merge or split PDF reports, compress scanned documents before emailing, crop or convert images for presentations, and run quick financial estimates without opening a spreadsheet.',
  },
  {
    heading: 'Content creators',
    detail:
      'Compress images for faster page loads, convert between formats, check dimensions before uploading to a CMS or social platform, and strip unnecessary metadata from files.',
  },
]

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="About QuickUtils — Free Online Utility Tools"
        description="Learn about QuickUtils, a free online utility tools website with 150+ tools for PDFs, images, calculators, developer tasks, exam documents, and more."
        path="/about"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

        {/* Page header */}
        <header className="mb-12">
          <span className="text-sm font-semibold text-primary mb-3 inline-block">About</span>
          <h1 className="text-3xl font-bold mb-4">About QuickUtils</h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            QuickUtils is a free online utility tools website. It brings together 150+ task-focused
            tools for working with PDFs, images, calculations, developer data, exam documents,
            and seller logistics — all available from a browser without creating an account.
          </p>
        </header>

        {/* What is QuickUtils */}
        <section className="rounded-xl border border-border/60 border-l-4 border-l-primary/40 bg-card/80 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">What is QuickUtils?</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              QuickUtils is a collection of single-purpose tools built for everyday digital tasks.
              Instead of installing desktop software or hunting for a trustworthy site each time,
              you can open a tool, complete the task, and move on. Every tool page includes a brief
              explanation of what the tool does, how to use it, and what to check in the output.
            </p>
            <p>
              Many tools — including PDF compression, image resizing, and JSON formatting — process
              files directly inside your browser using client-side JavaScript. Your files are not
              uploaded to a remote server for these operations, which keeps the process fast and
              private. A small number of conversion tools use a backend server where browser-only
              processing is not practical; those pages note this clearly.
            </p>
            <p>
              Most tools require no account and no sign-up. You can bookmark individual tools for
              quicker access on return visits. An account is only needed for administrative access
              to the site itself.
            </p>
          </div>
        </section>

        {/* Who QuickUtils is for */}
        <section className="rounded-xl border border-border/60 border-l-4 border-l-primary/40 bg-card/80 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">Who QuickUtils is for</h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            The tools are built for anyone who runs into a common file, calculation, or data task
            and wants to complete it quickly without installing software. Some specific examples:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {audiences.map((item) => (
              <div
                key={item.heading}
                className="rounded-lg border border-border/60 bg-background p-4 hover:border-primary/20 hover:bg-card transition-colors duration-200"
              >
                <p className="text-sm font-semibold mb-1">{item.heading}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tool categories */}
        <section className="rounded-xl border border-border/60 border-l-4 border-l-primary/40 bg-card/80 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">Tool categories</h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            QuickUtils organises its tools into six main categories:
          </p>
          <ul className="space-y-4">
            {toolCategories.map((cat) => (
              <li key={cat.name}>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold mr-2">{cat.name}</span>
                <span className="text-sm text-muted-foreground leading-relaxed">{cat.description}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/tools"
              className="text-primary hover:underline text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
            >
              Browse all tools
            </Link>
            <Link href="/categories"
              className="text-primary hover:underline text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
            >
              View by category
            </Link>
          </div>
        </section>

        {/* Our approach */}
        <section className="rounded-xl border border-border/60 border-l-4 border-l-primary/40 bg-card/80 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">Our approach</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Each tool page is built around a single task. The page title, instructions, and
              output labels are written to match how someone would describe the task in plain
              language, not how a developer might describe the underlying process. Where a tool
              has known limitations — a maximum file size, a format it cannot handle, or a scenario
              where the output should be double-checked — that information is shown on the page.
            </p>
            <p>
              Browser-side processing is used wherever it is practical. This avoids unnecessary
              file transfers for sensitive documents such as ID photos, salary slips, or exam
              forms. When a tool does send data to a server, the page says so.
            </p>
            <p>
              Calculators on QuickUtils produce estimates based on the values you enter and standard
              formulas. They are useful for planning and comparison, but results should be verified
              against official sources before being used in financial, medical, or legal decisions.
              The site does not claim that any calculator output is authoritative.
            </p>
          </div>
        </section>

        {/* Built for India's competitive exam aspirants */}
        <section className="rounded-xl border border-border/60 border-l-4 border-l-primary/40 bg-card/80 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">Built for India's government exam aspirants</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A large part of QuickUtils is designed specifically for students and job seekers preparing applications for SSC (CGL, CHSL, MTS), IBPS (PO, Clerk), RRB (NTPC, Group D, ALP), SBI, RBI, NABARD, TNPSC, UPSC, and various state PSCs.
            </p>
            <p>
              We track official notification specifications for photo dimensions (e.g. 100×120 px, 200×230 px, 35×45 mm), signature sizes (140×60 px), and file size limits (20 KB, 50 KB, 80 KB for PAN/Aadhaar, 200 KB for certificates, 300 KB for marksheets). Tools like the SSC Photo Resizer, Railway Photo Resizer, Bank Exam Photo Tool, Photo KB Reducer, Exam Document PDF Compressor, and Image to Exam PDF are built to hit those exact targets using quality-optimization algorithms while keeping everything in your browser for privacy.
            </p>
            <p>
              Every such tool page includes: step-by-step instructions, real notification examples, "when the portal rejects it anyway" troubleshooting, limitations, and a clear reminder to always re-verify against the latest official notice PDF.
            </p>
          </div>
          <div className="mt-4 text-sm">
            <Link href="/tools" className="text-primary hover:underline font-medium">Browse government exam tools →</Link>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 border-l-4 border-l-primary/40 bg-card/80 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-3">Trust, review, and transparency</h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            QuickUtils is operated by Learnithm and led by Arulraj S. The public trust
            pages below explain who is responsible for the site, how tool and content quality is
            reviewed, and how users can report mistakes or accessibility barriers.
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/team" className="text-primary hover:underline">Team</Link>
            <Link href="/author/arulraj-s" className="text-primary hover:underline">Author profile</Link>
            <Link href="/methodology" className="text-primary hover:underline">Methodology</Link>
            <Link href="/corrections-policy" className="text-primary hover:underline">Corrections Policy</Link>
            <Link href="/accessibility" className="text-primary hover:underline">Accessibility</Link>
          </div>
        </section>

        {/* Get in touch */}
        <section className="mt-12">
          <div className="rounded-xl border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">Get in touch</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If a tool produces an unexpected result, a page has unclear instructions, or you have
              a suggestion for a new utility, the QuickUtils team is happy to hear from you. When
              reporting an issue, including the tool name, the URL of the page, and a brief
              description of what happened helps resolve it faster.
            </p>
            <Link href="/contact"
              className="text-primary hover:underline text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
            >
              Contact QuickUtils
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
