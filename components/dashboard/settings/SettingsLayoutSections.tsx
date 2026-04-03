'use client';

import {
  ChevronRight,
  ExternalLink,
  Heart,
  HelpCircle,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';

import PWAInstallPrompt from '../../../components/ui/PWAInstallPrompt';
import type { SettingSection, SettingsSectionId } from '../../../types/settings';

export type SettingsNavigationProps = {
  sections: SettingSection[];
  activeSection: SettingsSectionId;
  onSelectSection: (sectionId: SettingsSectionId) => void;
};

export function SettingsNavigation({
  sections,
  activeSection,
  onSelectSection,
}: SettingsNavigationProps) {
  return (
    <div className="card p-4">
      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelectSection(section.id)}
            className={`flex w-full items-center rounded-lg p-3 text-left transition-colors ${
              activeSection === section.id
                ? 'bg-fixly-primary-bg text-fixly-primary'
                : 'text-fixly-text-secondary hover:bg-fixly-bg-secondary'
            }`}
          >
            <section.icon className="mr-3 h-5 w-5" />
            <div className="flex-1">
              <div className="font-medium">{section.title}</div>
              <div className="text-xs opacity-75">{section.description}</div>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        ))}
      </nav>
    </div>
  );
}

export type SettingsFooterProps = {
  onSignOut: () => void;
};

export function SettingsFooter({ onSignOut }: SettingsFooterProps) {
  return (
    <div className="mt-12 border-t border-fixly-border pt-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <h4 className="mb-4 text-lg font-semibold text-fixly-text">About Fixly</h4>
          <p className="mb-4 text-sm text-fixly-text-muted">
            Connecting skilled fixers with customers who need reliable home services. Building trust
            through quality and professionalism.
          </p>
          <div className="space-y-2">
            <a
              href="/about"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              About Us
            </a>
            <a
              href="/how-it-works"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              How It Works
            </a>
            <a
              href="/safety"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Safety & Trust
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-lg font-semibold text-fixly-text">Contact & Support</h4>
          <div className="space-y-3">
            <a
              href="mailto:blessancorley@gmail.com"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <Mail className="mr-2 h-4 w-4" />
              blessancorley@gmail.com
            </a>
            <a
              href="tel:+919976768211"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <Phone className="mr-2 h-4 w-4" />
              +91 9976768211
            </a>
            <a
              href="https://wa.me/919976768211?text=Hi! I need help with my Fixly account."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp Support
            </a>
            <a
              href="/support"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help Center
            </a>
            <a
              href="/contact"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Contact Us
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-lg font-semibold text-fixly-text">Legal & Resources</h4>
          <div className="space-y-2">
            <a
              href="/terms"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Terms of Service
            </a>
            <a
              href="/privacy"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Privacy Policy
            </a>
            <a
              href="/cookies"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Cookie Policy
            </a>
            <a
              href="/resources"
              className="flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Resources
            </a>

            <div className="mt-4 border-t border-fixly-border pt-2">
              <PWAInstallPrompt variant="link" className="w-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-fixly-border pt-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <h4 className="mb-1 text-lg font-semibold text-fixly-text">Account Actions</h4>
            <p className="text-sm text-fixly-text-muted">
              Manage your account or sign out securely
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-6 py-3 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="mt-8 border-t border-fixly-border pt-6 text-center">
        <div className="mb-2 flex items-center justify-center">
          <Heart className="mr-1 h-4 w-4 text-red-500" />
          <span className="text-sm text-fixly-text-muted">Made with love by the Fixly team</span>
        </div>
        <p className="text-xs text-fixly-text-muted">
          Â© 2025 Fixly. All rights reserved. Building trust through quality service connections.
        </p>
      </div>
    </div>
  );
}
