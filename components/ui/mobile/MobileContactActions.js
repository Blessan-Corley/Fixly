'use client';

import { Phone, Mail, MapPin } from 'lucide-react';

export function MobileContactActions({ phone, email, address, className = '' }) {
  const actions = [
    phone && {
      icon: Phone,
      label: 'Call',
      href: `tel:${phone}`,
      color: 'text-green-600'
    },
    email && {
      icon: Mail,
      label: 'Email',
      href: `mailto:${email}`,
      color: 'text-blue-600'
    },
    address && {
      icon: MapPin,
      label: 'Directions',
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      color: 'text-red-600'
    }
  ].filter(Boolean);

  return (
    <div className={`flex space-x-4 ${className}`}>
      {actions.map((action, index) => (
        <a
          key={index}
          href={action.href}
          target={action.href.startsWith('http') ? '_blank' : undefined}
          rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className={`
            flex flex-col items-center space-y-1 p-3 rounded-lg
            bg-fixly-card border border-fixly-border
            hover:bg-fixly-accent/10 transition-colors
            ${action.color}
          `}
        >
          <action.icon className="h-5 w-5" />
          <span className="text-xs font-medium">{action.label}</span>
        </a>
      ))}
    </div>
  );
}