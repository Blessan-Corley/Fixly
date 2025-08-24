// app/api/jobs/[jobId]/apply/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';
import { moderateContent } from '../../../../../utils/sensitiveContentFilter';
import { analytics } from '@/lib/cache';
import notificationService from '@/lib/realtime/NotificationService';
import nodemailer from 'nodemailer';

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_application', 20, 60 * 60 * 1000); // 20 applications per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many job applications. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can apply to jobs' },
        { status: 403 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    // Check if user can apply (credits or pro subscription)
    if (!user.canApplyToJob()) {
      return NextResponse.json(
        { 
          message: 'You have used all 3 free job applications. Upgrade to Pro for unlimited access.',
          needsUpgrade: true
        },
        { status: 403 }
      );
    }

    const job = await Job.findById(jobId).populate('createdBy', 'name email preferences');
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if job is still open
    if (job.status !== 'open') {
      return NextResponse.json(
        { message: 'This job is no longer accepting applications' },
        { status: 400 }
      );
    }

    // Check if deadline has passed
    if (job.deadline < new Date()) {
      return NextResponse.json(
        { message: 'Application deadline has passed' },
        { status: 400 }
      );
    }

    // Check if user can apply to this job
    if (!job.canApply(user._id)) {
      return NextResponse.json(
        { message: 'You cannot apply to this job' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      proposedAmount,
      timeEstimate,
      materialsList,
      description, // Replaced coverLetter and workPlan with simple description
      materialsIncluded,
      requirements,
      specialNotes,
      negotiationNotes
    } = body;

    // Validation
    if (!proposedAmount || proposedAmount <= 0) {
      return NextResponse.json(
        { message: 'Proposed amount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // For fixed price jobs, check if proposed amount is within reasonable range
    if (job.budget.type === 'fixed' && job.budget.amount) {
      const variance = Math.abs(proposedAmount - job.budget.amount);
      const maxVariance = job.budget.amount * 0.5; // 50% variance allowed
      
      if (variance > maxVariance) {
        return NextResponse.json(
          { 
            message: `Proposed amount (₹${proposedAmount.toLocaleString()}) is too far from the fixed budget (₹${job.budget.amount.toLocaleString()}). Please propose within ±50% of the budget.`,
            suggestedRange: {
              min: Math.round(job.budget.amount * 0.5),
              max: Math.round(job.budget.amount * 1.5)
            }
          },
          { status: 400 }
        );
      }
    }

    if (description && description.length > 600) {
      return NextResponse.json(
        { message: 'Description must be less than 600 characters' },
        { status: 400 }
      );
    }

    if (!description || description.length < 20) {
      return NextResponse.json(
        { message: 'Please provide a description (at least 20 characters)' },
        { status: 400 }
      );
    }

    // Check for sensitive content in application fields
    const fieldsToCheck = [
      { name: 'description', value: description },
      { name: 'requirements', value: requirements },
      { name: 'specialNotes', value: specialNotes }
    ];

    for (const field of fieldsToCheck) {
      if (field.value && field.value.trim()) {
        const moderationResult = moderateContent(field.value.trim(), {
          allowAutoClean: false,
          strictMode: true
        });

        if (!moderationResult.allowed) {
          return NextResponse.json(
            { 
              message: `Your ${field.name.replace(/([A-Z])/g, ' $1').toLowerCase()} contains sensitive information that cannot be shared: ${moderationResult.message}`,
              violations: moderationResult.violations,
              type: 'sensitive_content',
              field: field.name
            },
            { status: 400 }
          );
        }
      }
    }

    // Calculate price variance for job budget comparison
    let priceVariance = 0;
    let priceVariancePercentage = 0;
    
    if (job.budget.amount && job.budget.amount > 0) {
      priceVariance = proposedAmount - job.budget.amount;
      priceVariancePercentage = (priceVariance / job.budget.amount) * 100;
    }

    // Create application
    const application = {
      fixer: user._id,
      proposedAmount: Number(proposedAmount),
      priceVariance: Math.round(priceVariance),
      priceVariancePercentage: Math.round(priceVariancePercentage * 100) / 100, // Round to 2 decimal places
      description: description || '',
      materialsIncluded: materialsIncluded || false,
      requirements: requirements || '',
      specialNotes: specialNotes || '',
      negotiationNotes: negotiationNotes || '',
      status: 'pending',
      appliedAt: new Date()
    };

    if (timeEstimate) {
      application.timeEstimate = {
        value: timeEstimate.value,
        unit: timeEstimate.unit || 'hours'
      };
    }

    if (materialsList && Array.isArray(materialsList)) {
      application.materialsList = materialsList.map(material => ({
        item: material.item,
        quantity: material.quantity || 1,
        estimatedCost: material.estimatedCost || 0
      }));
    }

    // Add application to job
    job.applications.push(application);
    
    // Track application analytics
    await analytics.trackEvent('job_applied', {
      jobId: job._id,
      jobTitle: job.title,
      jobCategory: job.skillsRequired[0],
      jobBudget: job.budget.amount,
      jobBudgetType: job.budget.type,
      proposedAmount: application.proposedAmount,
      priceVariance: application.priceVariance,
      priceVariancePercentage: application.priceVariancePercentage,
      applicationCount: job.applications.length
    }, user._id);
    
    await job.save();

    // Get the newly created application
    const newApplication = job.applications[job.applications.length - 1];

    // Emit real-time event for new application
    emitToJob(jobId, 'application:new', {
      jobId: job._id,
      applicationId: newApplication._id,
      fixer: {
        _id: user._id,
        name: user.name,
        username: user.username,
        photoURL: user.photoURL,
        rating: user.rating
      },
      proposedAmount: newApplication.proposedAmount,
      priceVariance: newApplication.priceVariance,
      priceVariancePercentage: newApplication.priceVariancePercentage,
      timeEstimate: newApplication.timeEstimate,
      timestamp: new Date()
    });

    // Emit to job owner specifically
    emitToUser(job.createdBy._id.toString(), 'notification:new', {
      type: 'job_applied',
      jobId: job._id,
      fromUser: user._id,
      message: `${user.name} has applied to your job "${job.title}"`,
      timestamp: new Date()
    });

    // Add notification to hirer
    const hirer = job.createdBy;
    await hirer.addNotification(
      'job_applied',
      'New Job Application',
      `${user.name} has applied to your job "${job.title}". Review their proposal now.`,
      {
        jobId: job._id,
        fixerId: user._id,
        applicationId: application._id
      }
    );

    // Add notification to fixer
    await user.addNotification(
      'application_sent',
      'Application Submitted',
      `Your application for "${job.title}" has been sent successfully.`,
      {
        jobId: job._id,
        applicationId: application._id
      }
    );

    // Send email notification to hirer if enabled
    try {
      if (hirer.preferences?.emailNotifications !== false) {
        await sendApplicationNotificationEmail(hirer, user, job, application);
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the application if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        _id: application._id,
        proposedAmount: application.proposedAmount,
        priceVariance: application.priceVariance,
        priceVariancePercentage: application.priceVariancePercentage,
        timeEstimate: application.timeEstimate,
        status: application.status,
        appliedAt: application.appliedAt
      },
      budgetComparison: job.budget.amount ? {
        jobBudget: job.budget.amount,
        proposedAmount: application.proposedAmount,
        difference: application.priceVariance,
        percentageDifference: application.priceVariancePercentage,
        budgetType: job.budget.type
      } : null,
      creditsRemaining: user.plan?.type === 'pro' ? 'unlimited' : Math.max(0, 3 - (user.plan?.creditsUsed || 0))
    }, { status: 201 });

  } catch (error) {
    console.error('Job application error:', error);
    return NextResponse.json(
      { message: 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    const job = await Job.findById(jobId).populate('createdBy', 'name username photoURL');

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check permissions - only job creator or applicants can view applications
    const isJobCreator = job.createdBy._id.toString() === user._id.toString();
    const isApplicant = job.applications.some(app => 
      app.fixer.toString() === user._id.toString()
    );

    if (!isJobCreator && !isApplicant) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    let applications;

    if (isJobCreator) {
      // Job creator sees all applications
      applications = await Job.findById(jobId)
        .select('applications')
        .populate('applications.fixer', 'name username photoURL rating jobsCompleted location skills')
        .lean();
      
      applications = applications.applications.map(app => ({
        _id: app._id,
        fixer: app.fixer,
        proposedAmount: app.proposedAmount,
        priceVariance: app.priceVariance || 0,
        priceVariancePercentage: app.priceVariancePercentage || 0,
        timeEstimate: app.timeEstimate,
        materialsList: app.materialsList,
        description: app.description,
        negotiationNotes: app.negotiationNotes,
        status: app.status,
        appliedAt: app.appliedAt
      }));
    } else {
      // Applicant sees only their own application
      const userApplication = job.applications.find(app => 
        app.fixer.toString() === user._id.toString()
      );
      
      applications = userApplication ? [userApplication] : [];
    }

    return NextResponse.json({
      applications,
      totalApplications: job.applications.length
    });

  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

async function sendApplicationNotificationEmail(hirer, fixer, job, application) {
  const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #374650; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DCF763; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e1e3e0; }
        .footer { background-color: #F1F2EE; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #DCF763; color: #374650; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .proposal-box { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .fixer-info { background-color: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #374650;">New Job Application! 🔧</h1>
        </div>
        <div class="content">
          <h2>Hi ${hirer.name}!</h2>
          <p>Great news! You've received a new application for your job:</p>
          
          <div class="proposal-box">
            <h3>"${job.title}"</h3>
            <p><strong>Location:</strong> ${job.location.city}, ${job.location.state}</p>
          </div>

          <div class="fixer-info">
            <h3>👨‍🔧 Fixer Details:</h3>
            <p><strong>Name:</strong> ${fixer.name}</p>
            <p><strong>Proposed Amount:</strong> ₹${application.proposedAmount.toLocaleString()}</p>
            ${application.timeEstimate ? `<p><strong>Estimated Time:</strong> ${application.timeEstimate.value} ${application.timeEstimate.unit}</p>` : ''}
            ${application.coverLetter ? `<p><strong>Message:</strong><br>"${application.coverLetter}"</p>` : ''}
          </div>
          
          <p>Review their full profile, ratings, and past work before making your decision.</p>
          
          <a href="${process.env.NEXTAUTH_URL}/dashboard/jobs/${job._id}" class="button">Review Application</a>
          
          <p><strong>💡 Pro Tip:</strong> Respond quickly to applications to get the best fixers!</p>
          
          <p>Best regards,<br>The Fixly Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0; font-size: 14px; color: #5a6c75;">
            This email was sent to ${hirer.email}. 
            <a href="${process.env.NEXTAUTH_URL}/settings/notifications" style="color: #374650;">Update preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Fixly" <${process.env.EMAIL_USER}>`,
    to: hirer.email,
    subject: `New Application for "${job.title}" 🔧`,
    html: emailTemplate,
  });
}