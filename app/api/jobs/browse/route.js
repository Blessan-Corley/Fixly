import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    await connectDB();

    // Get jobs with pagination
    const jobs = await Job.find({ status: { $in: ['open', 'in_progress'] } })
      .select('title description location budget deadline status client createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Job.countDocuments({ status: { $in: ['open', 'in_progress'] } });

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Browse jobs error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
