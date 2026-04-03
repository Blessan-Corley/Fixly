import { describe, expect, it } from 'vitest';

import { Channels, Events } from '@/lib/ably/events';

describe('Ably Channels', () => {
  it('generates correct user channel name', () => {
    expect(Channels.user('user123')).toBe('private:user:user123');
  });

  it('generates correct job channel name', () => {
    expect(Channels.job('job456')).toBe('job:job456');
  });

  it('generates correct conversation channel name', () => {
    expect(Channels.conversation('conv789')).toBe('chat:conv789');
  });

  it('marketplace channel is a string constant', () => {
    expect(typeof Channels.marketplace).toBe('string');
  });
});

describe('Ably Events', () => {
  it('all user events are strings', () => {
    Object.values(Events.user).forEach((eventName) => {
      expect(typeof eventName).toBe('string');
      expect(eventName.length).toBeGreaterThan(0);
    });
  });

  it('all job events are strings', () => {
    Object.values(Events.job).forEach((eventName) => {
      expect(typeof eventName).toBe('string');
    });
  });

  it('event names use dot notation', () => {
    expect(Events.user.notificationSent).toContain('.');
    expect(Events.job.statusChanged).toContain('.');
    expect(Events.conversation.messageSent).toContain('.');
  });
});
