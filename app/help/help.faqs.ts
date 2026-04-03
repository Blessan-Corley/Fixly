import type { FaqCategory } from './help.types';

export const FAQS: FaqCategory[] = [
  {
    id: 'general',
    title: 'General Questions',
    questions: [
      {
        q: 'How does Fixly work?',
        a: 'Fixly connects customers who need services (hirers) with skilled service providers (fixers). Hirers post jobs, fixers apply, and once hired, they complete the work and get paid securely.',
      },
      {
        q: 'Is Fixly free to use?',
        a: 'Fixly is free for hirers. Fixers get 3 free applications per month, with unlimited applications available through our Pro plan at ₹99/month.',
      },
      {
        q: 'How do I know if a fixer is reliable?',
        a: 'All fixers go through verification. You can check their ratings, reviews, portfolio, and work history before hiring.',
      },
      {
        q: "What if I'm not satisfied with the work?",
        a: 'We have a dispute resolution system. Funds are held in escrow, and we mediate any issues between hirers and fixers.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payment Questions',
    questions: [
      {
        q: 'How do I get paid as a fixer?',
        a: 'Payments are held in escrow and released to your account within 24 hours of job completion. You can withdraw to your bank account or UPI.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept credit/debit cards, UPI, net banking, and digital wallets through our secure payment processor.',
      },
      {
        q: 'Are there any fees?',
        a: 'Hirers pay no additional fees. Fixers pay a 5% service fee on earnings and ₹99/month for Pro subscription (optional).',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Security',
    questions: [
      {
        q: 'How do you verify users?',
        a: 'We verify phone numbers, email addresses, and government IDs. Background checks are available for sensitive services.',
      },
      {
        q: 'Is my personal information safe?',
        a: 'Yes, we use bank-level security and never share your personal information without consent.',
      },
      {
        q: 'What if something goes wrong during a job?',
        a: 'Contact our support team immediately. We have 24/7 support and dispute resolution processes in place.',
      },
    ],
  },
];
