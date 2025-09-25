/**
 * Test API for Ably Integration
 * Allows testing real-time notifications without full job posting flow
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTemplatedNotification, NOTIFICATION_TEMPLATES } from '@/lib/services/notificationService';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data = {} } = await request.json();

    switch (action) {
      case 'test_welcome':
        const result = await sendTemplatedNotification(
          'WELCOME',
          session.user.id,
          { userName: session.user.name || 'User' }
        );

        return NextResponse.json({
          success: true,
          message: 'Welcome notification sent',
          notificationId: result.notificationId
        });

      case 'test_job_comment':
        const commentResult = await sendTemplatedNotification(
          'JOB_COMMENT',
          session.user.id,
          {
            commenterName: 'Test User',
            jobTitle: 'Test Job - Kitchen Repair',
            jobId: 'test_job_123',
            commentId: 'test_comment_456'
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Job comment notification sent',
          notificationId: commentResult.notificationId
        });

      case 'test_application_accepted':
        const acceptedResult = await sendTemplatedNotification(
          'APPLICATION_ACCEPTED',
          session.user.id,
          {
            jobTitle: 'Bathroom Plumbing Fix',
            jobId: 'test_job_789'
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Application accepted notification sent',
          notificationId: acceptedResult.notificationId
        });

      case 'test_private_message':
        const messageResult = await sendTemplatedNotification(
          'PRIVATE_MESSAGE',
          session.user.id,
          {
            senderName: 'John Doe',
            messagePreview: 'Hi! I wanted to discuss the job details...',
            jobId: 'test_job_abc',
            senderId: 'test_user_123'
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Private message notification sent',
          notificationId: messageResult.notificationId
        });

      case 'test_subscription_success':
        const subResult = await sendTemplatedNotification(
          'SUBSCRIPTION_SUCCESS',
          session.user.id,
          {}
        );

        return NextResponse.json({
          success: true,
          message: 'Subscription success notification sent',
          notificationId: subResult.notificationId
        });

      case 'list_templates':
        return NextResponse.json({
          success: true,
          templates: Object.keys(NOTIFICATION_TEMPLATES).map(key => ({
            key,
            type: NOTIFICATION_TEMPLATES[key].type,
            title: NOTIFICATION_TEMPLATES[key].title,
            priority: NOTIFICATION_TEMPLATES[key].priority
          }))
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: [
            'test_welcome',
            'test_job_comment',
            'test_application_accepted',
            'test_private_message',
            'test_subscription_success',
            'list_templates'
          ]
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Ably test API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get connection status and available actions
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      },
      availableTests: [
        {
          action: 'test_welcome',
          description: 'Send a welcome notification'
        },
        {
          action: 'test_job_comment',
          description: 'Send a job comment notification'
        },
        {
          action: 'test_application_accepted',
          description: 'Send an application accepted notification'
        },
        {
          action: 'test_private_message',
          description: 'Send a private message notification'
        },
        {
          action: 'test_subscription_success',
          description: 'Send a subscription success notification'
        },
        {
          action: 'list_templates',
          description: 'List all available notification templates'
        }
      ],
      instructions: {
        method: 'POST',
        body: {
          action: 'test_welcome',
          data: '(optional additional data)'
        }
      }
    });

  } catch (error) {
    console.error('Ably test GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}