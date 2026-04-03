'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import Link from 'next/link';

import type { FixerPlan } from './pricing.data';

type PricingFixerPlansProps = {
  plans: FixerPlan[];
};

export default function PricingFixerPlans({ plans }: PricingFixerPlansProps): React.JSX.Element {
  return (
    <div className="mx-auto mb-16 grid max-w-4xl gap-8 lg:grid-cols-2">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`card relative ${plan.color} ${plan.popular ? 'shadow-xl' : ''}`}
        >
          {plan.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
              <span className="rounded-full bg-fixly-accent px-4 py-1 text-sm font-medium text-fixly-text">
                Most Popular
              </span>
            </div>
          )}

          <div className="mb-6 text-center">
            <h3 className="mb-2 text-2xl font-bold text-fixly-text">{plan.name}</h3>
            <div className="mb-4 flex items-baseline justify-center">
              <span className="text-4xl font-bold text-fixly-text">{plan.price}</span>
              <span className="ml-1 text-fixly-text-muted">{plan.period}</span>
            </div>
            <p className="text-fixly-text-light">{plan.description}</p>
          </div>

          <div className="mb-8 space-y-4">
            <div>
              <h4 className="mb-3 font-semibold text-fixly-text">What&apos;s included:</h4>
              <ul className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <Check className="mr-3 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span className="text-sm text-fixly-text-light">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {plan.limitations.length > 0 && (
              <div>
                <h4 className="mb-3 font-semibold text-fixly-text">Limitations:</h4>
                <ul className="space-y-2">
                  {plan.limitations.map((limitation, idx) => (
                    <li key={idx} className="flex items-center">
                      <X className="mr-3 h-4 w-4 flex-shrink-0 text-red-500" />
                      <span className="text-sm text-fixly-text-muted">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link
            href={
              plan.name === 'Free Plan'
                ? '/auth/signup?role=fixer'
                : '/auth/signup?role=fixer&plan=pro'
            }
            className={`block w-full rounded-lg py-3 text-center font-medium transition-colors ${
              plan.popular
                ? 'bg-fixly-accent text-fixly-text hover:bg-fixly-accent-dark'
                : 'bg-fixly-border text-fixly-text hover:bg-fixly-accent hover:text-fixly-text'
            }`}
          >
            {plan.buttonText}
          </Link>

          {plan.name === 'Pro Plan' && (
            <p className="mt-4 text-center text-sm text-fixly-text-muted">Rs999/year</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
