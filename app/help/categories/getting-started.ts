import { Play } from 'lucide-react';

import type { HelpCategory } from '../help.types';

export const gettingStarted: HelpCategory = {
  id: 'getting-started',
  title: 'Getting Started',
  icon: Play,
  description: 'Learn the basics of using Fixly',
  articles: [
    {
      id: 'what-is-fixly',
      title: 'What is Fixly?',
      content: `
          <h2>Welcome to Fixly!</h2>
          <p>Fixly is a hyperlocal service marketplace that connects customers (hirers) with skilled service providers (fixers) in their area. Whether you need home repairs, professional services, or specialized skills, Fixly makes it easy to find the right person for the job.</p>

          <h3>How it works:</h3>
          <ol>
            <li><strong>For Hirers:</strong> Post your job requirements, review applications, and hire the best fixer</li>
            <li><strong>For Fixers:</strong> Browse available jobs, submit applications, and get hired for your skills</li>
            <li><strong>Secure Payments:</strong> All payments are processed securely through our platform</li>
            <li><strong>Quality Assurance:</strong> Rate and review system ensures quality service</li>
          </ol>

          <h3>Key Features:</h3>
          <ul>
            <li>Local service providers in your area</li>
            <li>Secure payment processing</li>
            <li>Real-time messaging</li>
            <li>Rating and review system</li>
            <li>Professional profiles</li>
            <li>Job tracking and management</li>
          </ul>
        `,
    },
    {
      id: 'create-account',
      title: 'How to Create an Account',
      content: `
          <h2>Creating Your Fixly Account</h2>
          <p>Getting started with Fixly is quick and easy. Follow these steps to create your account:</p>

          <h3>Step 1: Choose Your Role</h3>
          <p>When you sign up, you&apos;ll need to choose your primary role:</p>
          <ul>
            <li><strong>Hirer:</strong> If you need services and want to hire fixers</li>
            <li><strong>Fixer:</strong> If you provide services and want to get hired</li>
          </ul>

          <h3>Step 2: Registration Options</h3>
          <p>You can register using:</p>
          <ul>
            <li>Google account (fastest option)</li>
            <li>Email and password</li>
            <li>Phone number (coming soon)</li>
          </ul>

          <h3>Step 3: Complete Your Profile</h3>
          <p>After registration, complete your profile with:</p>
          <ul>
            <li>Personal information</li>
            <li>Location details</li>
            <li>Skills and experience (for fixers)</li>
            <li>Profile photo</li>
          </ul>

          <h3>Step 4: Verification</h3>
          <p>For security and trust, we verify:</p>
          <ul>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Identity documents (for fixers)</li>
          </ul>
        `,
    },
    {
      id: 'complete-profile',
      title: 'Completing Your Profile',
      content: `
          <h2>Building a Strong Profile</h2>
          <p>A complete profile helps you get better results on Fixly. Here&apos;s how to optimize your profile:</p>

          <h3>For Fixers:</h3>
          <ul>
            <li><strong>Profile Photo:</strong> Use a clear, professional headshot</li>
            <li><strong>Skills:</strong> Add all relevant skills and certifications</li>
            <li><strong>Portfolio:</strong> Upload photos of your previous work</li>
            <li><strong>Description:</strong> Write a compelling bio highlighting your experience</li>
            <li><strong>Rates:</strong> Set competitive hourly or project rates</li>
            <li><strong>Availability:</strong> Update your schedule and preferred work times</li>
          </ul>

          <h3>For Hirers:</h3>
          <ul>
            <li><strong>Profile Photo:</strong> Add a friendly, trustworthy photo</li>
            <li><strong>Location:</strong> Ensure your location is accurate</li>
            <li><strong>Verification:</strong> Complete identity verification</li>
            <li><strong>Payment Methods:</strong> Add secure payment options</li>
          </ul>

          <h3>Tips for Success:</h3>
          <ul>
            <li>Keep information up-to-date</li>
            <li>Respond to messages promptly</li>
            <li>Maintain professionalism</li>
            <li>Ask for reviews after completing jobs</li>
          </ul>
        `,
    },
  ],
};
