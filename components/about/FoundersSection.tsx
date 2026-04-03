'use client';

import { motion } from 'framer-motion';
import { Github, Linkedin, Mail, Twitter } from 'lucide-react';
import Image from 'next/image';

import type { founders } from '@/app/about/about.data';

type Props = {
  founderList: typeof founders;
};

export function FoundersSection({ founderList }: Props): React.JSX.Element {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">
            Meet Our Founders
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-fixly-text-light">
            The passionate team behind Fixly&rsquo;s mission to transform how services are
            discovered and delivered.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
          {founderList.map((founder, index) => (
            <motion.div
              key={founder.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 ease-in-out hover:scale-105 hover:transform hover:shadow-2xl">
                <div className="relative h-80 overflow-hidden">
                  <Image
                    src={founder.image}
                    alt={founder.name}
                    width={200}
                    height={200}
                    className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:scale-110 group-hover:grayscale-0"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="absolute bottom-0 left-0 right-0 translate-y-full transform p-6 text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    <blockquote className="mb-3 text-sm italic">
                      &ldquo;{founder.quote}&rdquo;
                    </blockquote>
                    <div className="mb-3 text-xs opacity-90">
                      <strong>Expertise:</strong> {founder.expertise}
                    </div>
                    <div className="flex space-x-3">
                      {founder.social.linkedin !== undefined && (
                        <a
                          href={founder.social.linkedin}
                          className="transition-colors hover:text-fixly-accent"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {founder.social.twitter !== undefined && (
                        <a
                          href={founder.social.twitter}
                          className="transition-colors hover:text-fixly-accent"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                      )}
                      {founder.social.github !== undefined && (
                        <a
                          href={founder.social.github}
                          className="transition-colors hover:text-fixly-accent"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {founder.social.email !== undefined && (
                        <a
                          href={`mailto:${founder.social.email}`}
                          className="transition-colors hover:text-fixly-accent"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <h3 className="mb-1 text-xl font-bold text-fixly-text">{founder.name}</h3>
                <p className="mb-3 font-medium text-fixly-accent">{founder.role}</p>
                <p className="text-sm leading-relaxed text-fixly-text-light">{founder.bio}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
