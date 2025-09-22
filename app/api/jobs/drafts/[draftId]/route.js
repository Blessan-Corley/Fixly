// app/api/jobs/drafts/[draftId]/route.js - Load Specific Draft API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/db';
import JobDraft from '../../../../../models/JobDraft';

export const dynamic = 'force-dynamic';

// GET - Load a specific draft
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { draftId } = params;

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

    // Check if draft is expired
    if (draft.isExpired) {
      return NextResponse.json({
        success: false,
        message: 'Draft has expired and will be deleted soon'
      }, { status: 410 }); // Gone
    }

    // Update activity timestamp
    await draft.updateActivity();

    console.log(`📋 Draft loaded: ${draftId} for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      draft: {
        _id: draft._id,
        title: draft.title,
        description: draft.description,
        skillsRequired: draft.skillsRequired,
        budget: draft.budget,
        location: draft.location,
        deadline: draft.deadline,
        scheduledDate: draft.scheduledDate,
        urgency: draft.urgency,
        attachments: draft.attachments,
        currentStep: draft.currentStep,
        completedSteps: draft.completedSteps,
        draftStatus: draft.draftStatus,
        completionPercentage: draft.completionPercentage,
        validationStatus: draft.validationStatus,
        lastActivity: draft.lastActivity,
        lastAutoSave: draft.lastAutoSave,
        lastManualSave: draft.lastManualSave,
        ageInHours: draft.ageInHours,
        hoursUntilExpiry: draft.hoursUntilExpiry,
        isExpired: draft.isExpired,
        photoCount: draft.photoCount,
        videoCount: draft.videoCount,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error loading draft:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load draft',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}