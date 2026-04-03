import { sendEmail } from '@/lib/email';
import { inngest } from '@/lib/inngest/client';
import { getUserById } from '@/lib/services/user/profile.queries';

export const onUserSignup = inngest.createFunction(
  { id: 'on-user-signup', name: 'Send welcome email on signup' },
  { event: 'user/signup.completed' },
  async ({ event, step }) => {
    const { userId, email, name, role } = event.data;

    await step.run('send-welcome-email', async () => {
      await sendEmail({
        to: email,
        subject: `Welcome to Fixly, ${name}!`,
        template: role === 'hirer' ? 'welcome-hirer' : 'welcome-fixer',
        data: { name, userId },
      });
    });

    await step.sleep('wait-for-onboarding', '24h');

    await step.run('check-onboarding-completion', async () => {
      const user = await getUserById(userId);

      if (user && !user.profileComplete) {
        await sendEmail({
          to: email,
          subject: 'Complete your Fixly profile',
          template: 'onboarding-reminder',
          data: { name },
        });
      }
    });
  }
);
