'use client';

import { motion } from 'framer-motion';
import { Clock, Video } from 'lucide-react';

import type { webinars } from '@/app/resources/resources.data';

type Props = {
  webinarList: typeof webinars;
};

export function WebinarsSection({ webinarList }: Props) {
  return (
    <section className="bg-fixly-card py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Educational Webinars
          </h2>
          <p className="text-xl text-fixly-text-light">
            Join our expert-led sessions to level up your skills
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {webinarList.map((webinar, index) => (
            <motion.div
              key={webinar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl bg-fixly-bg p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fixly-accent/10">
                  <Video className="h-5 w-5 text-fixly-accent" />
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    webinar.status === 'upcoming'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {webinar.status === 'upcoming' ? 'Upcoming' : 'Recorded'}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-semibold text-fixly-text">{webinar.title}</h3>

              <div className="mb-3 flex items-center text-sm text-fixly-text-muted">
                <Clock className="mr-2 h-4 w-4" />
                {webinar.date} at {webinar.time}
              </div>

              <p className="mb-6 text-sm text-fixly-text-light">{webinar.description}</p>

              <button className="btn-primary w-full text-sm">
                {webinar.status === 'upcoming' ? 'Register Now' : 'Watch Recording'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
