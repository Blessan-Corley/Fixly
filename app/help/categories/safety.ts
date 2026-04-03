import { Shield } from 'lucide-react';

import type { HelpCategory } from '../help.types';

export const safetySecurity: HelpCategory = {
  id: 'safety-security',
  title: 'Safety & Security',
  icon: Shield,
  description: 'Staying safe while using Fixly',
  articles: [
    {
      id: 'safety-guidelines',
      title: 'Safety Guidelines',
      content: `
          <h2>Staying Safe on Fixly</h2>
          <p>Your safety is our priority. Follow these guidelines for a secure experience:</p>

          <h3>Profile Verification</h3>
          <ul>
            <li><strong>Identity Verification:</strong> Complete government ID verification</li>
            <li><strong>Phone Verification:</strong> Verify your phone number</li>
            <li><strong>Email Verification:</strong> Confirm your email address</li>
            <li><strong>Background Checks:</strong> Available for sensitive services</li>
          </ul>

          <h3>Communication Safety</h3>
          <ul>
            <li><strong>Platform Messaging:</strong> Use Fixly&apos;s messaging system</li>
            <li><strong>No Personal Info:</strong> Don&apos;t share personal contact details initially</li>
            <li><strong>Professional Communication:</strong> Keep conversations work-related</li>
            <li><strong>Report Issues:</strong> Report inappropriate behavior immediately</li>
          </ul>

          <h3>Meeting in Person</h3>
          <ul>
            <li><strong>Public Meetings:</strong> First meetings in public places</li>
            <li><strong>Inform Others:</strong> Let someone know your whereabouts</li>
            <li><strong>Trust Your Instincts:</strong> Cancel if something feels wrong</li>
            <li><strong>Work Hours:</strong> Prefer normal business hours</li>
          </ul>

          <h3>Payment Security</h3>
          <ul>
            <li><strong>Platform Payments:</strong> Always use Fixly&apos;s payment system</li>
            <li><strong>No Cash:</strong> Avoid cash transactions</li>
            <li><strong>No Advance Payment:</strong> Never pay before work starts</li>
            <li><strong>Dispute Resolution:</strong> Use our mediation service</li>
          </ul>

          <h3>Red Flags to Watch For</h3>
          <ul>
            <li>Requests to move communication off-platform</li>
            <li>Pressure for immediate payment or work</li>
            <li>Incomplete or fake profiles</li>
            <li>Requests for personal financial information</li>
            <li>Jobs that seem too good to be true</li>
          </ul>
        `,
    },
  ],
};
