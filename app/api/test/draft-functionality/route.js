// app/api/test/draft-functionality/route.js - Test Draft Functionality
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { redisRateLimit } from '../../../../lib/redis';
import connectDB from '../../../../lib/db';
import JobDraft from '../../../../models/JobDraft';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Test database connection
    const testResults = {
      databaseConnection: false,
      redisConnection: false,
      draftCount: 0,
      testDraftCreated: false,
      testDraftLoaded: false,
      testDraftUpdated: false,
      testDraftDeleted: false
    };

    // Test MongoDB connection
    try {
      const draftCount = await JobDraft.countDocuments({ createdBy: session.user.id });
      testResults.databaseConnection = true;
      testResults.draftCount = draftCount;
      console.log(`📊 Found ${draftCount} drafts for user ${session.user.id}`);
    } catch (dbError) {
      console.error('❌ Database test failed:', dbError);
    }

    // Test Redis connection
    try {
      const rateLimitResult = await redisRateLimit(`test:${session.user.id}`, 10, 60);
      testResults.redisConnection = rateLimitResult.success !== undefined;
      console.log('📊 Redis connection test passed');
    } catch (redisError) {
      console.error('❌ Redis test failed:', redisError);
    }

    // Test draft creation
    try {
      const testDraft = new JobDraft({
        createdBy: session.user.id,
        title: `Test Draft ${Date.now()}`,
        description: 'This is a test draft to verify functionality',
        skillsRequired: ['testing'],
        budget: { type: 'negotiable' },
        location: { address: 'Test Address', city: 'Test City', state: 'Test State' },
        urgency: 'flexible',
        attachments: [],
        currentStep: 1,
        draftStatus: 'manually_saved'
      });

      await testDraft.save();
      testResults.testDraftCreated = true;
      console.log(`📝 Test draft created: ${testDraft._id}`);

      // Test draft loading
      const loadedDraft = await JobDraft.findById(testDraft._id);
      if (loadedDraft) {
        testResults.testDraftLoaded = true;
        console.log(`📋 Test draft loaded successfully`);

        // Test draft updating
        loadedDraft.description = 'Updated test description';
        await loadedDraft.addManualSave(2, { test: 'update' });
        testResults.testDraftUpdated = true;
        console.log(`✏️ Test draft updated successfully`);

        // Test draft deletion
        await JobDraft.findByIdAndDelete(testDraft._id);
        testResults.testDraftDeleted = true;
        console.log(`🗑️ Test draft deleted successfully`);
      }

    } catch (draftTestError) {
      console.error('❌ Draft functionality test failed:', draftTestError);
    }

    return NextResponse.json({
      success: true,
      message: 'Draft functionality test completed',
      results: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Test failed',
        error: error.message
      },
      { status: 500 }
    );
  }
}