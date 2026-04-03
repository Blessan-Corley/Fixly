import { Briefcase } from 'lucide-react';

import type { HelpCategory } from '../help.types';

export const forFixers: HelpCategory = {
  id: 'for-fixers',
  title: 'For Fixers',
  icon: Briefcase,
  description: 'How to find jobs and get hired',
  articles: [
    {
      id: 'find-jobs',
      title: 'Finding and Applying to Jobs',
      content: `
          <h2>Finding the Right Jobs</h2>
          <p>Here&apos;s how to find and apply to jobs that match your skills:</p>

          <h3>Browsing Jobs</h3>
          <ul>
            <li><strong>Dashboard:</strong> View recommended jobs on your dashboard</li>
            <li><strong>Browse Jobs:</strong> Explore all available jobs</li>
            <li><strong>Search:</strong> Use keywords to find specific types of work</li>
            <li><strong>Filters:</strong> Filter by location, budget, urgency, and skills</li>
          </ul>

          <h3>Understanding Job Posts</h3>
          <p>Each job posting includes:</p>
          <ul>
            <li><strong>Job Description:</strong> What needs to be done</li>
            <li><strong>Requirements:</strong> Skills and experience needed</li>
            <li><strong>Budget:</strong> Payment details</li>
            <li><strong>Timeline:</strong> When the work should be completed</li>
            <li><strong>Location:</strong> Where the work will be done</li>
            <li><strong>Client Info:</strong> About the person hiring</li>
          </ul>

          <h3>Writing Great Applications</h3>
          <p>Your application should include:</p>
          <ul>
            <li><strong>Personal Introduction:</strong> Brief intro about yourself</li>
            <li><strong>Relevant Experience:</strong> How your skills match the job</li>
            <li><strong>Approach:</strong> How you plan to complete the work</li>
            <li><strong>Timeline:</strong> When you can start and finish</li>
            <li><strong>Rate:</strong> Your proposed fee</li>
            <li><strong>Questions:</strong> Any clarifications needed</li>
          </ul>

          <h3>Application Tips:</h3>
          <ul>
            <li>Personalize each application</li>
            <li>Be professional but friendly</li>
            <li>Highlight relevant experience</li>
            <li>Ask thoughtful questions</li>
            <li>Propose realistic timelines</li>
            <li>Price competitively but fairly</li>
          </ul>
        `,
    },
    {
      id: 'subscription-plans',
      title: 'Understanding Subscription Plans',
      content: `
          <h2>Fixer Subscription Plans</h2>
          <p>Fixly offers different plans to help fixers succeed:</p>

          <h3>Free Plan</h3>
          <ul>
            <li>3 job applications per month</li>
            <li>Basic profile features</li>
            <li>Standard customer support</li>
            <li>Access to job browse</li>
          </ul>

          <h3>Pro Plan (&#8377;99/month)</h3>
          <ul>
            <li><strong>Unlimited Applications:</strong> Apply to as many jobs as you want</li>
            <li><strong>Priority Listing:</strong> Your applications appear first</li>
            <li><strong>Advanced Analytics:</strong> Track your success rate</li>
            <li><strong>Premium Support:</strong> Priority customer service</li>
            <li><strong>Featured Profile:</strong> Highlighted in search results</li>
            <li><strong>Skills Verification:</strong> Verified skill badges</li>
          </ul>

          <h3>Choosing the Right Plan</h3>
          <p>Consider upgrading to Pro if you:</p>
          <ul>
            <li>Want to apply to more than 3 jobs per month</li>
            <li>Are looking for consistent work</li>
            <li>Want to stand out from competition</li>
            <li>Need detailed analytics</li>
            <li>Prefer priority support</li>
          </ul>

          <h3>Payment and Billing</h3>
          <ul>
            <li>Monthly billing on the same date each month</li>
            <li>Secure payment through Razorpay</li>
            <li>Cancel anytime with immediate effect</li>
            <li>Unused applications don&apos;t roll over</li>
          </ul>
        `,
    },
  ],
};
