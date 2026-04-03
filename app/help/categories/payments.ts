import { CreditCard } from 'lucide-react';

import type { HelpCategory } from '../help.types';

export const payments: HelpCategory = {
  id: 'payments',
  title: 'Payments & Billing',
  icon: CreditCard,
  description: 'How payments work on Fixly',
  articles: [
    {
      id: 'how-payments-work',
      title: 'How Payments Work',
      content: `
          <h2>Secure Payment Processing</h2>
          <p>Fixly ensures secure and timely payments for all parties:</p>

          <h3>For Hirers</h3>
          <ul>
            <li><strong>Escrow System:</strong> Funds are held securely until work is completed</li>
            <li><strong>Payment Methods:</strong> Credit/debit cards, UPI, net banking</li>
            <li><strong>Release Process:</strong> Funds released after job completion confirmation</li>
            <li><strong>Dispute Protection:</strong> Mediation available for payment disputes</li>
          </ul>

          <h3>For Fixers</h3>
          <ul>
            <li><strong>Guaranteed Payment:</strong> Payment held in escrow before work starts</li>
            <li><strong>Quick Release:</strong> Funds released within 24 hours of completion</li>
            <li><strong>Multiple Withdrawals:</strong> Bank transfer, UPI, or wallet</li>
            <li><strong>Earnings Tracking:</strong> Detailed earnings dashboard</li>
          </ul>

          <h3>Payment Timeline</h3>
          <ol>
            <li><strong>Job Acceptance:</strong> Hirer deposits funds to escrow</li>
            <li><strong>Work in Progress:</strong> Funds remain secure in escrow</li>
            <li><strong>Work Completion:</strong> Fixer marks job as complete</li>
            <li><strong>Review Period:</strong> 24-hour review period for hirer</li>
            <li><strong>Payment Release:</strong> Funds released to fixer&apos;s account</li>
          </ol>

          <h3>Fees and Charges</h3>
          <ul>
            <li><strong>Hirers:</strong> No additional fees on job payments</li>
            <li><strong>Fixers:</strong> 5% service fee on earnings</li>
            <li><strong>Subscription:</strong> &#8377;99/month for Pro plan (fixers only)</li>
            <li><strong>Payment Processing:</strong> Standard gateway charges apply</li>
          </ul>
        `,
    },
  ],
};
