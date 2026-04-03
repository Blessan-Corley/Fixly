import { sendContactFormEmail, sendEmail } from '../services/emailService';
import { sendWhatsAppNotification } from '../whatsapp';

import {
  ADMIN_EMAIL,
  ADMIN_WHATSAPP,
  type ContactFormSubmissionData,
  type DisputeCreatedData,
  type JobPostedData,
  type NewUserRegistrationData,
  type PaymentIssueData,
  type SystemErrorData,
  getSafeNumberText,
  getSafeText,
  toHtml,
} from './types';

export async function handleContactFormSubmission(
  data: ContactFormSubmissionData
): Promise<PromiseSettledResult<unknown>[]> {
  const name = getSafeText(data.name);
  const email = getSafeText(data.email);
  const phone = getSafeText(data.phone);
  const category = getSafeText(data.category, 'General');
  const subject = getSafeText(data.subject, 'General Inquiry');
  const message = getSafeText(data.message);

  const contactBody = `New contact form submission from ${name} (${email})

Category: ${category}
Phone: ${phone}

Message:
${message}`;
  const emailPromise = sendContactFormEmail(ADMIN_EMAIL, email, `[Contact] ${subject}`, contactBody);

  const preview = message.length > 100 ? `${message.slice(0, 100)}...` : message;
  const whatsappPromise = sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `New Fixly contact message

From: ${name}
Email: ${email}
Category: ${category}
Message: ${preview}`,
  });

  return Promise.allSettled([emailPromise, whatsappPromise]);
}

export async function handleNewUserRegistration(data: NewUserRegistrationData): Promise<boolean> {
  const userName = getSafeText(data.userName);
  const userEmail = getSafeText(data.userEmail);
  const userRole = getSafeText(data.userRole);
  const userLocation = getSafeText(data.userLocation);

  return sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `New Fixly user registration

Name: ${userName}
Email: ${userEmail}
Role: ${userRole}
Location: ${userLocation}`,
  });
}

export async function handleJobPosted(data: JobPostedData): Promise<boolean> {
  const jobTitle = getSafeText(data.jobTitle);
  const hirerName = getSafeText(data.hirerName);
  const budget = getSafeNumberText(data.budget);
  const location = getSafeText(data.location);
  const urgency = getSafeText(data.urgency);

  return sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `New job posted on Fixly

Title: ${jobTitle}
Posted by: ${hirerName}
Budget: ${budget}
Location: ${location}
Urgency: ${urgency}`,
  });
}

export async function handlePaymentIssue(
  data: PaymentIssueData
): Promise<PromiseSettledResult<unknown>[]> {
  const userId = getSafeText(data.userId);
  const amount = getSafeNumberText(data.amount);
  const error = getSafeText(data.error);
  const transactionId = getSafeText(data.transactionId);

  const paymentIssueText = `Payment issue detected:

User ID: ${userId}
Amount: ${amount}
Error: ${error}
Transaction ID: ${transactionId}

Immediate attention required.`;
  const emailPromise = sendEmail(
    ADMIN_EMAIL,
    '[Urgent] Payment issue on Fixly',
    `<p>${toHtml(paymentIssueText)}</p>`,
    paymentIssueText
  );

  const whatsappPromise = sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `Urgent payment issue

Amount: ${amount}
User: ${userId}
Error: ${error}`,
  });

  return Promise.allSettled([emailPromise, whatsappPromise]);
}

export async function handleDisputeCreated(data: DisputeCreatedData): Promise<boolean> {
  const jobTitle = getSafeText(data.jobTitle);
  const disputeReason = getSafeText(data.disputeReason);
  const involvedUsers = Array.isArray(data.involvedUsers)
    ? data.involvedUsers.filter(
        (user): user is string => typeof user === 'string' && user.trim().length > 0
      )
    : [];

  return sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `New dispute created

Job: ${jobTitle}
Reason: ${disputeReason}
Users: ${involvedUsers.join(', ') || 'Not provided'}`,
  });
}

export async function handleSystemError(data: SystemErrorData): Promise<void> {
  const error = getSafeText(data.error);
  const endpoint = getSafeText(data.endpoint);
  const userId = getSafeText(data.userId);
  const severity = getSafeText(data.severity, 'normal').toLowerCase();

  if (severity !== 'critical') {
    return;
  }

  const systemErrorText = `Critical system error:

Error: ${error}
Endpoint: ${endpoint}
User ID: ${userId}
Time: ${new Date().toISOString()}

Immediate investigation required.`;
  const emailPromise = sendEmail(
    ADMIN_EMAIL,
    '[Critical] System error on Fixly',
    `<p>${toHtml(systemErrorText)}</p>`,
    systemErrorText
  );

  const whatsappPromise = sendWhatsAppNotification({
    phoneNumber: ADMIN_WHATSAPP,
    message: `Critical system error

Error: ${error}
Endpoint: ${endpoint}`,
  });

  await Promise.allSettled([emailPromise, whatsappPromise]);
}
