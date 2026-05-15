import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Twitter, Github, Mail, ArrowRight } from 'lucide-react';

const TOOL_LINKS = [
{ to: '/tool/emi-calculator', label: 'EMI Calculator' },
{ to: '/tool/bmi-calculator', label: 'BMI Calculator' },
{ to: '/tool/word-counter', label: 'Word Counter' },
{ to: '/tool/json-formatter', label: 'JSON Formatter' },
{ to: '/tool/password-generator', label: 'Password Generator' },
{ to: '/tool/sip-calculator', label: 'SIP Calculator' }];


export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/60 backdrop-blur-sm pb-3 pl-8 pr-10 pt-10">
      <div className="max-w-7xl mx-auto sm:px-6 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">
                <span className="gradient-text">Tool</span>Hub
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Free online tools for developers, writers, students and professionals.
              Fast, private and always free.
            </p>
            <div className="flex gap-2">
              {[
              { Icon: Twitter, href: '#', label: 'Twitter' },
              { Icon: Github, href: '#', label: 'GitHub' },
              { Icon: Mail, href: '/contact', label: 'Email' }].
              map(({ Icon: SocialIcon, href, label }) =>
              <a
                key={label}
                href={href}
                title={label}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                
                  <SocialIcon className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Popular Tools */}
          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wide text-foreground">Popular Tools</h4>
            <div className="flex flex-col gap-2">
              {TOOL_LINKS.map(({ to, label }) =>
              <Link
                key={to}
                to={to}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">
                
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {label}
                </Link>
              )}
            </div>
          </div>

          {/* Navigate */}
          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wide text-foreground">Navigate</h4>
            <div className="flex flex-col gap-2">
              {[
              { to: '/', label: 'Home' },
              { to: '/tools', label: 'All Tools' },
              { to: '/categories', label: 'Categories' },
              { to: '/blog', label: 'Blog' },
              { to: '/about', label: 'About' },
              { to: '/contact', label: 'Contact' }].
              map(({ to, label }) =>
              <Link key={to} to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              )}
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-sm mb-4 uppercase tracking-wide text-foreground">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
            <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">100% Free, Forever</p>
              <p className="text-xs text-muted-foreground">No sign-up. No paywalls. All tools are free to use.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ToolHub. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ❤️ for the internet
          </p>
        </div>
      </div>
    </footer>);

}