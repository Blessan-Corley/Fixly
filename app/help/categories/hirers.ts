import { Users } from 'lucide-react';

import type { HelpCategory } from '../help.types';

export const forHirers: HelpCategory = {
  id: 'for-hirers',
  title: 'For Hirers',
  icon: Users,
  description: 'How to post jobs and hire fixers',
  articles: [
    {
      id: 'post-job',
      title: 'How to Post a Job',
      content: `
          <h2>Posting Your First Job</h2>
          <p>Follow these steps to create an effective job posting:</p>

          <h3>Step 1: Job Details</h3>
          <ul>
            <li><strong>Title:</strong> Create a clear, descriptive title</li>
            <li><strong>Description:</strong> Provide detailed requirements and expectations</li>
            <li><strong>Category:</strong> Select the most relevant category</li>
            <li><strong>Skills Required:</strong> List specific skills needed</li>
          </ul>

          <h3>Step 2: Budget and Timeline</h3>
          <ul>
            <li><strong>Budget Type:</strong> Fixed price, hourly, or negotiable</li>
            <li><strong>Amount:</strong> Set a fair and competitive budget</li>
            <li><strong>Timeline:</strong> Specify when you need the work completed</li>
            <li><strong>Urgency:</strong> Mark as urgent, medium, or low priority</li>
          </ul>

          <h3>Step 3: Location and Preferences</h3>
          <ul>
            <li><strong>Location:</strong> Set work location (your address, remote, or fixer&apos;s location)</li>
            <li><strong>Availability:</strong> Specify preferred working hours</li>
            <li><strong>Special Requirements:</strong> Any additional requirements or preferences</li>
          </ul>

          <h3>Tips for Better Applications:</h3>
          <ul>
            <li>Be specific about what you need</li>
            <li>Set realistic budgets and timelines</li>
            <li>Include photos if relevant</li>
            <li>Respond to questions promptly</li>
          </ul>
        `,
    },
    {
      id: 'review-applications',
      title: 'Reviewing and Managing Applications',
      content: `
          <h2>Managing Job Applications</h2>
          <p>Once you post a job, fixers will start applying. Here&apos;s how to manage applications effectively:</p>

          <h3>Viewing Applications</h3>
          <ul>
            <li>Go to Dashboard > My Jobs</li>
            <li>Click on your job to see all applications</li>
            <li>Review fixer profiles, rates, and proposals</li>
            <li>Check ratings and reviews from previous clients</li>
          </ul>

          <h3>Evaluating Fixers</h3>
          <p>Consider these factors when choosing a fixer:</p>
          <ul>
            <li><strong>Experience:</strong> Relevant skills and portfolio</li>
            <li><strong>Reviews:</strong> Previous client feedback</li>
            <li><strong>Communication:</strong> Quality of their application message</li>
            <li><strong>Price:</strong> Fair pricing for the scope of work</li>
            <li><strong>Timeline:</strong> Can they meet your deadline?</li>
          </ul>

          <h3>Making Your Decision</h3>
          <ul>
            <li><strong>Accept:</strong> Choose your preferred fixer</li>
            <li><strong>Message:</strong> Ask questions before deciding</li>
            <li><strong>Reject:</strong> Politely decline unsuitable applications</li>
            <li><strong>Shortlist:</strong> Keep promising candidates for comparison</li>
          </ul>

          <h3>Best Practices:</h3>
          <ul>
            <li>Respond to applications within 48 hours</li>
            <li>Ask relevant questions about experience</li>
            <li>Check references for large projects</li>
            <li>Set clear expectations from the start</li>
          </ul>
        `,
    },
  ],
};
