'use client';

import { motion } from 'framer-motion';
import { Mail, MessageSquare, Phone } from 'lucide-react';

export default function ContactCtaSection(): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="card mt-12 text-center"
    >
      <h2 className="mb-4 text-2xl font-bold text-fixly-text">Other Ways to Reach Us</h2>
      <p className="mb-6 text-fixly-text-light">
        Choose the method that works best for you. We&apos;re committed to providing excellent
        customer service and support.
      </p>

      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <a
          href="mailto:blessancorley@gmail.com"
          className="btn-primary flex items-center justify-center"
        >
          <Mail className="mr-2 h-5 w-5" />
          Email Support
        </a>
        <a href="tel:+919976768211" className="btn-secondary flex items-center justify-center">
          <Phone className="mr-2 h-5 w-5" />
          Call Now
        </a>
        <a
          href="https://wa.me/919976768211?text=Hi! I need help with Fixly."
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent flex items-center justify-center"
        >
          <MessageSquare className="mr-2 h-5 w-5" />
          WhatsApp Chat
        </a>
      </div>
    </motion.div>
  );
}
