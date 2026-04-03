'use client';

import { motion } from 'framer-motion';
import { Download } from 'lucide-react';

import type { resourceCategories } from '@/app/resources/resources.data';

type Props = {
  categories: typeof resourceCategories;
};

export function ResourceCategoriesSection({ categories }: Props) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-fixly-text md:text-4xl">Resource Library</h2>
          <p className="text-xl text-fixly-text-light">
            Comprehensive guides, templates, and tools to grow your business
          </p>
        </div>

        <div className="space-y-12">
          {categories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl bg-fixly-card p-8"
            >
              <div className="mb-8 flex items-center">
                <div
                  className={`${category.color} mr-4 flex h-12 w-12 items-center justify-center rounded-lg`}
                >
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="mb-1 text-2xl font-semibold text-fixly-text">{category.title}</h3>
                  <p className="text-fixly-text-light">{category.description}</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {category.resources.map((resource) => (
                  <div
                    key={resource.title}
                    className="hover-lift rounded-lg bg-fixly-bg p-6 transition-all duration-200 hover:shadow-fixly"
                  >
                    <div className="mb-4 flex items-center">
                      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-fixly-accent/10">
                        <resource.icon className="h-5 w-5 text-fixly-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-fixly-text">{resource.title}</h4>
                        <span className="text-xs font-medium text-fixly-accent">{resource.type}</span>
                      </div>
                    </div>
                    <p className="mb-4 text-sm text-fixly-text-light">{resource.description}</p>
                    <button className="flex items-center text-sm font-medium text-fixly-accent transition-colors hover:text-fixly-accent/80">
                      <Download className="mr-2 h-4 w-4" />
                      Download Resource
                    </button>
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
