// app/api/user/fixer-settings/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user exists and is a fixer
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can update fixer settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      availableNow,
      serviceRadius,
      hourlyRate,
      minimumJobValue,
      maximumJobValue,
      responseTime,
      workingHours,
      workingDays,
      skills,
      portfolio,
      autoApply,
      emergencyAvailable
    } = body;

    // Validation
    const validationErrors = [];

    // Service radius validation
    if (serviceRadius !== undefined) {
      if (typeof serviceRadius !== 'number' || serviceRadius < 1 || serviceRadius > 100) {
        validationErrors.push('Service radius must be between 1 and 100 km');
      }
    }

    // Rate validation
    if (hourlyRate !== undefined && hourlyRate !== '') {
      const rate = parseFloat(hourlyRate);
      if (isNaN(rate) || rate < 0 || rate > 10000) {
        validationErrors.push('Hourly rate must be between ₹0 and ₹10,000');
      }
    }

    // Job value validation
    if (minimumJobValue !== undefined && minimumJobValue !== '') {
      const minValue = parseFloat(minimumJobValue);
      if (isNaN(minValue) || minValue < 0) {
        validationErrors.push('Minimum job value must be ₹0 or greater');
      }
    }

    if (maximumJobValue !== undefined && maximumJobValue !== '') {
      const maxValue = parseFloat(maximumJobValue);
      if (isNaN(maxValue) || maxValue < 0) {
        validationErrors.push('Maximum job value must be ₹0 or greater');
      }
    }

    // Cross-validation for min/max job values
    if (minimumJobValue && maximumJobValue && 
        parseFloat(minimumJobValue) > parseFloat(maximumJobValue)) {
      validationErrors.push('Minimum job value cannot be greater than maximum job value');
    }

    // Response time validation
    if (responseTime !== undefined) {
      const validResponseTimes = ['0.5', '1', '2', '4', '8', '24'];
      if (!validResponseTimes.includes(responseTime.toString())) {
        validationErrors.push('Invalid response time');
      }
    }

    // Working hours validation
    if (workingHours !== undefined) {
      if (!workingHours.start || !workingHours.end) {
        validationErrors.push('Both start and end times are required');
      } else {
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(workingHours.start) || !timeRegex.test(workingHours.end)) {
          validationErrors.push('Invalid time format. Use HH:MM format');
        }
      }
    }

    // Working days validation
    if (workingDays !== undefined) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (!Array.isArray(workingDays) || workingDays.length === 0) {
        validationErrors.push('At least one working day must be selected');
      } else {
        const invalidDays = workingDays.filter(day => !validDays.includes(day));
        if (invalidDays.length > 0) {
          validationErrors.push(`Invalid working days: ${invalidDays.join(', ')}`);
        }
      }
    }

    // Skills validation
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        validationErrors.push('Skills must be an array');
      } else if (skills.length === 0) {
        validationErrors.push('At least one skill is required for fixers');
      } else if (skills.length > 20) {
        validationErrors.push('Maximum 20 skills allowed');
      } else {
        // Validate each skill
        const invalidSkills = skills.filter(skill => 
          typeof skill !== 'string' || skill.trim().length === 0 || skill.length > 50
        );
        if (invalidSkills.length > 0) {
          validationErrors.push('All skills must be valid strings (1-50 characters)');
        }
      }
    }

    // Portfolio validation
    if (portfolio !== undefined) {
      if (!Array.isArray(portfolio)) {
        validationErrors.push('Portfolio must be an array');
      } else if (portfolio.length > 10) {
        validationErrors.push('Maximum 10 portfolio items allowed');
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { message: 'Validation errors', errors: validationErrors },
        { status: 400 }
      );
    }

    // Prepare update object
    const updateData = {};

    if (availableNow !== undefined) updateData.availableNow = Boolean(availableNow);
    if (serviceRadius !== undefined) updateData.serviceRadius = Number(serviceRadius);
    if (hourlyRate !== undefined) {
      updateData.hourlyRate = hourlyRate === '' ? null : Number(hourlyRate);
    }
    if (minimumJobValue !== undefined) {
      updateData.minimumJobValue = minimumJobValue === '' ? null : Number(minimumJobValue);
    }
    if (maximumJobValue !== undefined) {
      updateData.maximumJobValue = maximumJobValue === '' ? null : Number(maximumJobValue);
    }
    if (responseTime !== undefined) updateData.responseTime = responseTime;
    if (workingHours !== undefined) updateData.workingHours = workingHours;
    if (workingDays !== undefined) updateData.workingDays = workingDays;
    if (skills !== undefined) {
      updateData.skills = skills.map(skill => skill.toLowerCase().trim());
    }
    if (portfolio !== undefined) updateData.portfolio = portfolio;
    if (autoApply !== undefined) updateData.autoApply = Boolean(autoApply);
    if (emergencyAvailable !== undefined) updateData.emergencyAvailable = Boolean(emergencyAvailable);

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Add notification about settings update
    await updatedUser.addNotification(
      'settings_updated',
      'Fixer Settings Updated',
      'Your fixer settings have been successfully updated.'
    );

    return NextResponse.json({
      success: true,
      message: 'Fixer settings updated successfully',
      user: {
        id: updatedUser._id,
        availableNow: updatedUser.availableNow,
        serviceRadius: updatedUser.serviceRadius,
        hourlyRate: updatedUser.hourlyRate,
        minimumJobValue: updatedUser.minimumJobValue,
        maximumJobValue: updatedUser.maximumJobValue,
        responseTime: updatedUser.responseTime,
        workingHours: updatedUser.workingHours,
        workingDays: updatedUser.workingDays,
        skills: updatedUser.skills,
        portfolio: updatedUser.portfolio,
        autoApply: updatedUser.autoApply,
        emergencyAvailable: updatedUser.emergencyAvailable
      }
    });

  } catch (error) {
    console.error('Fixer settings update error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to update fixer settings' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can access fixer settings' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        availableNow: user.availableNow,
        serviceRadius: user.serviceRadius,
        hourlyRate: user.hourlyRate,
        minimumJobValue: user.minimumJobValue,
        maximumJobValue: user.maximumJobValue,
        responseTime: user.responseTime,
        workingHours: user.workingHours,
        workingDays: user.workingDays,
        skills: user.skills,
        portfolio: user.portfolio,
        autoApply: user.autoApply,
        emergencyAvailable: user.emergencyAvailable
      }
    });

  } catch (error) {
    console.error('Get fixer settings error:', error);
    return NextResponse.json(
      { message: 'Failed to get fixer settings' },
      { status: 500 }
    );
  }
}