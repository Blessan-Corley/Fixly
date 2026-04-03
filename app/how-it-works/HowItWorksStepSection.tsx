'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { customerSteps, fixerSteps } from './how-it-works.data';

type Props = {
  variant: 'customer' | 'fixer';
  title: string;
  subtitle: string;
  ctaHref: string;
  ctaLabel: string;
  cardBg: string;
  sectionClassName?: string;
  ctaClassName: string;
};

export default function HowItWorksStepSection({
  variant,
  title,
  subtitle,
  ctaHref,
  ctaLabel,
  cardBg,
  sectionClassName = '',
  ctaClassName,
}: Props): React.JSX.Element {
  const steps = variant === 'customer' ? customerSteps : fixerSteps;
  return (
    <section className={`px-4 py-16 sm:px-6 lg:px-8 ${sectionClassName}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">{title}</h2>
          <p className="text-xl text-fixly-text-light">{subtitle}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className={`h-full rounded-xl p-6 ${cardBg}`}>
                <div className="mb-4 flex items-center justify-center">
                  <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent text-lg font-bold text-fixly-text">
                    {step.step}
                  </div>
                  <step.icon className="h-8 w-8 text-fixly-accent" />
                </div>

                <h3 className="mb-3 text-center text-xl font-semibold text-fixly-text">
                  {step.title}
                </h3>

                <p className="mb-4 text-center text-fixly-text-light">{step.description}</p>

                <ul className="space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <li
                      key={detailIndex}
                      className="flex items-start text-sm text-fixly-text-muted"
                    >
                      <div className="mr-2 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fixly-accent" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>

              {index < steps.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 hidden h-6 w-6 -translate-y-1/2 transform text-fixly-accent lg:block" />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href={ctaHref} className={`hover-lift px-8 py-4 text-lg ${ctaClassName}`}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
