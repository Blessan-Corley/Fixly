// app/api/jobs/drafts/route.js - Job Draft Management API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { redisRateLimit } from '../../../../lib/redis';
import connectDB from '../../../../lib/db';
import JobDraft from '../../../../models/JobDraft';

export const dynamic = 'force-dynamic';

// GET - Fetch user's drafts
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeConverted = searchParams.get('includeConverted') === 'true';

    await connectDB();

    const query = {
      createdBy: session.user.id,
      ...(includeConverted ? {} : { convertedToJob: false })
    };

    const drafts = await JobDraft.findUserDrafts(session.user.id, limit);

    console.log(`📋 Fetched ${drafts.length} drafts for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      drafts: drafts.map(draft => ({
        _id: draft._id,
        title: draft.title || 'Untitled Job',
        description: draft.description,
        completionPercentage: draft.completionPercentage,
        currentStep: draft.currentStep,
        draftStatus: draft.draftStatus,
        lastActivity: draft.lastActivity,
        lastAutoSave: draft.lastAutoSave,
        lastManualSave: draft.lastManualSave,
        ageInHours: draft.ageInHours,
        hoursUntilExpiry: draft.hoursUntilExpiry,
        isExpired: draft.isExpired,
        photoCount: draft.photoCount,
        videoCount: draft.videoCount,
        convertedToJob: draft.convertedToJob,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching drafts:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch drafts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create new draft or save existing draft
export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Redis-based rate limiting - 60 draft saves per hour per IP
    const rateLimitResult = await redisRateLimit(`draft_save:${ip}`, 60, 3600);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many draft save requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request body'
      }, { status: 400 });
    }

    const {
      draftId,
      formData,
      currentStep,
      saveType = 'auto', // 'auto', 'manual', 'step_change'
      completedSteps = []
    } = body;

    await connectDB();

    let draft;
    let isNewDraft = false;

    if (draftId) {
      // Update existing draft
      draft = await JobDraft.findOne({
        _id: draftId,
        createdBy: session.user.id
      });

      if (!draft) {
        return NextResponse.json({
          success: false,
          message: 'Draft not found or access denied'
        }, { status: 404 });
      }

      // Update draft data
      Object.assign(draft, {
        title: formData.title || '',
        description: formData.description || '',
        skillsRequired: formData.skillsRequired || [],
        budget: formData.budget || { type: 'negotiable' },
        location: formData.location || {},
        deadline: formData.deadline ? new Date(formData.deadline) : null,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : null,
        urgency: formData.urgency || 'flexible',
        attachments: formData.attachments || [],
        currentStep: currentStep,
        completedSteps: completedSteps.map(step => ({
          step,
          completedAt: new Date()
        }))
      });

    } else {
      // Create new draft
      isNewDraft = true;
      draft = new JobDraft({
        createdBy: session.user.id,
        title: formData.title || '',
        description: formData.description || '',
        skillsRequired: formData.skillsRequired || [],
        budget: formData.budget || { type: 'negotiable' },
        location: formData.location || {},
        deadline: formData.deadline ? new Date(formData.deadline) : null,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : null,
        urgency: formData.urgency || 'flexible',
        attachments: formData.attachments || [],
        currentStep: currentStep || 1,
        completedSteps: completedSteps.map(step => ({
          step,
          completedAt: new Date()
        })),
        draftStatus: saveType === 'manual' ? 'manually_saved' : 'auto_saved'
      });
    }

    // Add save history
    const dataSnapshot = {
      title: formData.title,
      description: formData.description,
      skillsRequired: formData.skillsRequired,
      budget: formData.budget,
      location: formData.location,
      deadline: formData.deadline,
      scheduledDate: formData.scheduledDate,
      urgency: formData.urgency,
      attachments: formData.attachments
    };

    if (saveType === 'manual') {
      await draft.addManualSave(currentStep, dataSnapshot);
    } else {
      await draft.addAutoSave(currentStep, dataSnapshot);
    }

    // Update activity
    await draft.updateActivity();

    console.log(`💾 Draft ${saveType} saved: ${draft._id} for user ${session.user.id} (Step ${currentStep})`);

    return NextResponse.json({
      success: true,
      message: `Draft ${saveType === 'manual' ? 'manually' : 'automatically'} saved`,
      draft: {
        _id: draft._id,
        title: draft.title || 'Untitled Job',
        completionPercentage: draft.completionPercentage,
        currentStep: draft.currentStep,
        draftStatus: draft.draftStatus,
        lastActivity: draft.lastActivity,
        lastAutoSave: draft.lastAutoSave,
        lastManualSave: draft.lastManualSave,
        isNewDraft
      }
    });

  } catch (error) {
    console.error('❌ Error saving draft:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save draft',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a draft
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');

    if (!draftId) {
      return NextResponse.json({
        success: false,
        message: 'Draft ID is required'
      }, { status: 400 });
    }

    await connectDB();

    const draft = await JobDraft.findOne({
      _id: draftId,
      createdBy: session.user.id
    });

    if (!draft) {
      return NextResponse.json({
        success: false,
        message: 'Draft not found or access denied'
      }, { status: 404 });
    }

    // Delete associated Cloudinary media
    if (draft.attachments && draft.attachments.length > 0) {
      const { v2: cloudinary } = require('cloudinary');

      // Configure Cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // Delete each attachment from Cloudinary
      for (const attachment of draft.attachments) {
        if (attachment.publicId) {
          try {
            await cloudinary.uploader.destroy(attachment.publicId, {
              resource_type: 'auto'
            });
            console.log(`🗑️ Deleted media from Cloudinary: ${attachment.publicId}`);
          } catch (cloudinaryError) {
            console.error(`❌ Failed to delete media from Cloudinary: ${attachment.publicId}`, cloudinaryError);
          }
        }
      }
    }

    // Delete the draft
    await JobDraft.findByIdAndDelete(draftId);

    console.log(`🗑️ Draft deleted: ${draftId} for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting draft:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete draft',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}