'use client';

import { motion } from 'framer-motion';

import type { emergencyProcedures } from '@/app/safety/safety.data';

type Props = {
  procedures: typeof emergencyProcedures;
};

export function EmergencyProceduresSection({ procedures }: Props): React.JSX.Element {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Emergency Procedures
          </h2>
          <p className="text-xl text-fixly-text-light">
            Know what to do in case of safety concerns or disputes
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {procedures.map((procedure, index) => (
            <motion.div
              key={procedure.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl bg-fixly-card p-6"
            >
              <div
                className={`${procedure.color} mb-4 flex h-12 w-12 items-center justify-center rounded-lg`}
              >
                <procedure.icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="mb-2 text-xl font-semibold text-fixly-text">{procedure.title}</h3>

              <p className="mb-6 text-fixly-text-light">{procedure.description}</p>

              <div className="space-y-3">
                {procedure.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-start">
                    <div className="mr-3 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-fixly-accent/20 text-xs font-bold text-fixly-accent">
                      {stepIndex + 1}
                    </div>
                    <span className="text-sm text-fixly-text-muted">{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
