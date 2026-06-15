import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FAQAccordion({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
      <Accordion type="single" collapsible className="space-y-2">
        {items.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border border-border/50 rounded-xl px-4 bg-card/50 data-[state=open]:bg-card"
          >
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}