'use client';

import { motion } from 'framer-motion';
import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import Link from 'next/link';

type Props = {
  homeHref: string;
  isAuthenticated: boolean;
};

export function ContactSection({ homeHref, isAuthenticated }: Props): React.JSX.Element {
  return (
    <section className="bg-fixly-card px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-6 text-3xl font-bold text-fixly-text md:text-4xl">Get in Touch</h2>
          <p className="mb-8 text-xl text-fixly-text-light">
            Have questions or want to learn more about Fixly? We&rsquo;d love to hear from you.
          </p>

          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center p-6">
              <Mail className="mb-3 h-8 w-8 text-fixly-accent" />
              <h3 className="mb-2 font-semibold text-fixly-text">Email Us</h3>
              <a
                href="mailto:blessancorley@gmail.com"
                className="text-fixly-accent transition-colors hover:text-fixly-accent-dark"
              >
                blessancorley@gmail.com
              </a>
            </div>

            <div className="flex flex-col items-center p-6">
              <Phone className="mb-3 h-8 w-8 text-fixly-accent" />
              <h3 className="mb-2 font-semibold text-fixly-text">Call Us</h3>
              <a
                href="tel:+919976768211"
                className="text-fixly-accent transition-colors hover:text-fixly-accent-dark"
              >
                +91 9976768211
              </a>
            </div>

            <div className="flex flex-col items-center p-6">
              <MessageSquare className="mb-3 h-8 w-8 text-fixly-accent" />
              <h3 className="mb-2 font-semibold text-fixly-text">WhatsApp</h3>
              <a
                href="https://wa.me/919976768211?text=Hi!%20I%27d%20like%20to%20know%20more%20about%20Fixly."
                target="_blank"
                rel="noopener noreferrer"
                className="text-fixly-accent transition-colors hover:text-fixly-accent-dark"
              >
                +91 9976768211
              </a>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="flex max-w-sm flex-col items-center p-6">
              <MapPin className="mb-3 h-8 w-8 text-fixly-accent" />
              <h3 className="mb-2 font-semibold text-fixly-text">Visit Us</h3>
              <a
                href="https://www.google.com/maps/search/?api=1&query=11.000044,77.080355"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer text-center text-fixly-text-muted transition-colors hover:text-fixly-accent"
              >
                Coimbatore, Tamil Nadu
                <br />
                India
              </a>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/support" className="btn-primary mr-4">
              Contact Support
            </Link>
            <Link href={homeHref} className="btn-secondary">
              {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
