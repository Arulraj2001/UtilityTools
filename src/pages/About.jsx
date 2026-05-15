import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Zap, Shield, Heart } from 'lucide-react';

export default function About() {
  const features = [
    { icon: Wrench, title: 'Free Tools', desc: 'All our tools are completely free, with no hidden charges or sign-up requirements.' },
    { icon: Zap, title: 'Lightning Fast', desc: 'All computations happen instantly in your browser for maximum speed and privacy.' },
    { icon: Shield, title: 'Privacy First', desc: 'Your data never leaves your browser. We don\'t store or track your inputs.' },
    { icon: Heart, title: 'Made with Love', desc: 'Built for developers, writers, students, and anyone who needs quick online tools.' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-4">About ToolHub</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-10">
          ToolHub is a collection of free online utilities designed to make your life easier. 
          From calculators and converters to text tools and developer utilities, we've got you covered.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {features.map((f, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-2xl bg-card border border-border/50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}