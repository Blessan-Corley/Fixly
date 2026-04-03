'use client';

import { Phone, Mail, MapPin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ContactAction {
  id: 'phone' | 'email' | 'address';
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
}

export interface MobileContactActionsProps {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  className?: string;
}

export function MobileContactActions({
  phone,
  email,
  address,
  className = '',
}: MobileContactActionsProps) {
  const actions: ContactAction[] = [];

  if (phone) {
    actions.push({
      id: 'phone',
      icon: Phone,
      label: 'Call',
      href: `tel:${phone}`,
      color: 'text-green-600',
    });
  }

  if (email) {
    actions.push({
      id: 'email',
      icon: Mail,
      label: 'Email',
      href: `mailto:${email}`,
      color: 'text-blue-600',
    });
  }

  if (address) {
    actions.push({
      id: 'address',
      icon: MapPin,
      label: 'Directions',
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      color: 'text-red-600',
    });
  }

  return (
    <div className={`flex space-x-4 ${className}`}>
      {actions.map((action) => {
        const ActionIcon = action.icon;
        const isExternal = action.href.startsWith('http');

        return (
          <a
            key={action.id}
            href={action.href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className={`
              flex flex-col items-center space-y-1 rounded-lg border
              border-fixly-border bg-fixly-card p-3
              transition-colors hover:bg-fixly-accent/10
              ${action.color}
            `}
          >
            <ActionIcon className="h-5 w-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </a>
        );
      })}
    </div>
  );
}
