import React from 'react'
import { BriefcaseBusiness, ArrowRight } from 'lucide-react'
import Link from 'next/link';

export default function JobsEmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
        <BriefcaseBusiness className="w-8 h-8 text-primary" />
      </div>

      <h3 className="text-2xl font-bold tracking-tight mb-2">
        No Jobs Available
      </h3>

      <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
        Job listings are not live yet. While new opportunities are being prepared,
        you can still use QuickUtils tools to get application documents ready.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
        <Link
          href="/category/government-exam-tools"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5 transition-all font-medium text-sm"
        >
          Application Tools
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href="/job-sources-policy"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium text-sm border border-primary/20"
        >
          Job Sources Policy
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto text-left">
        <Link href="/tool/passport-size-photo-maker" className="rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 transition-colors">
          <h4 className="text-sm font-semibold mb-1">Passport photo maker</h4>
          <p className="text-xs text-muted-foreground">Prepare standard profile photos for forms and applications.</p>
        </Link>
        <Link href="/tool/ssc-signature-resizer" className="rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 transition-colors">
          <h4 className="text-sm font-semibold mb-1">Signature resizer</h4>
          <p className="text-xs text-muted-foreground">Resize signatures for exam and recruitment portals.</p>
        </Link>
        <Link href="/workflow?q=compress%20pdf" className="rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 transition-colors">
          <h4 className="text-sm font-semibold mb-1">Compress PDF workflow</h4>
          <p className="text-xs text-muted-foreground">Get documents ready for common upload size limits.</p>
        </Link>
      </div>
    </div>
  )
}
