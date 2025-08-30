import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth';
import { MongoClient } from 'mongodb';
import { validateAndSanitize, addSecurityHeaders } from '../../../../../../utils/validation';
import User from '../../../../../../models/User';
import Job from '../../../../../../models/Job';
import { rateLimit } from '../../../../../../utils/rateLimiting';

const uri = process.env.MONGODB_URI;
let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('fixly');
}

// Rate limiting for individual user actions
const adminUserActionLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 50,
  maxRequests: 30, // 30 actions per minute per admin
});

// Enhanced admin authentication
async function authenticateAdmin(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { error: 'Authentication required', status: 401 };
  }
  
  await connectToDatabase();
  const user = await User.findById(session.user.id).select('role banned isActive adminMetadata');
  
  if (!user || user.role !== 'admin' || user.banned || !user.isActive) {
    return { error: 'Admin access required', status: 403 };
  }
  
  if (user.adminMetadata?.accountStatus === 'suspended') {
    return { error: 'Admin account suspended', status: 403 };
  }
  
  return { user, session };
}

// POST /api/admin/users/[userId]/[action] - Individual user actions
export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await adminUserActionLimit(request);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authenticate admin
    const auth = await authenticateAdmin(request);
    if (auth.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { userId, action } = params;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const targetUser = await User.findById(userId).select('-passwordHash');
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent actions on admin accounts (except viewing)
    if (targetUser.role === 'admin' && action !== 'view') {
      return NextResponse.json(
        { success: false, error: 'Cannot perform actions on admin accounts' },
        { status: 403 }
      );
    }

    // Prevent self-actions (except viewing)
    if (targetUser._id.toString() === auth.user._id.toString() && action !== 'view') {
      return NextResponse.json(
        { success: false, error: 'Cannot perform actions on your own account' },
        { status: 403 }
      );
    }

    let updateData = {};
    let successMessage = '';
    let shouldSendNotification = false;
    let notificationData = {};

    switch (action) {
      case 'ban':
        const body = await request.json();
        
        // Comprehensive ban management
        const banType = validateAndSanitize.string(body.type, {
          enum: ['temporary', 'permanent'],
          required: true
        });
        
        const banReason = validateAndSanitize.string(body.reason, {
          required: true,
          minLength: 10,
          maxLength: 500
        });
        
        const banCategory = validateAndSanitize.string(body.category, {
          enum: ['spam', 'abuse', 'fraud', 'inappropriate_content', 'harassment', 
                 'fake_profile', 'payment_issues', 'terms_violation', 'other'],
          required: true
        });
        
        const severity = validateAndSanitize.string(body.severity, {
          enum: ['minor', 'major', 'severe', 'critical'],
          required: true
        });
        
        let banExpiresAt = null;
        if (banType === 'temporary') {
          const duration = validateAndSanitize.number(body.duration, {
            min: 1,
            max: 365,
            required: true
          });
          const durationUnit = validateAndSanitize.string(body.durationUnit, {
            enum: ['hours', 'days', 'weeks', 'months'],
            required: true
          });
          
          let multiplier;
          switch (durationUnit) {
            case 'hours': multiplier = 60 * 60 * 1000; break;
            case 'days': multiplier = 24 * 60 * 60 * 1000; break;
            case 'weeks': multiplier = 7 * 24 * 60 * 60 * 1000; break;
            case 'months': multiplier = 30 * 24 * 60 * 60 * 1000; break;
          }
          
          banExpiresAt = new Date(Date.now() + duration * multiplier);
        }
        
        const adminNote = validateAndSanitize.string(body.adminNote, {
          maxLength: 1000
        });
        
        updateData = {
          banned: true,
          bannedReason: banReason,
          bannedAt: new Date(),
          bannedBy: auth.user._id,
          isActive: false,
          'adminMetadata.accountStatus': 'suspended',
          'adminMetadata.riskLevel': 'critical',
          'adminMetadata.banDetails': {
            type: banType,
            category: banCategory,
            severity: severity,
            reason: banReason,
            adminNote: adminNote,
            expiresAt: banExpiresAt,
            canAppeal: body.allowAppeal !== false,
            appealDeadline: banExpiresAt ? 
              new Date(banExpiresAt.getTime() + 30 * 24 * 60 * 60 * 1000) : // 30 days after unban
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days for permanent
            issuedBy: auth.user._id,
            issuedAt: new Date()
          },
          'adminMetadata.lastModifiedBy': auth.user._id,
          'adminMetadata.lastModifiedAt': new Date()
        };
        
        successMessage = `User banned ${banType === 'permanent' ? 'permanently' : `for ${body.duration} ${body.durationUnit}`}`;
        shouldSendNotification = true;
        notificationData = {
          type: 'account_banned',
          title: 'Account Suspended',
          message: `Your account has been ${banType === 'permanent' ? 'permanently suspended' : `suspended until ${banExpiresAt.toLocaleDateString()}`}.\n\nReason: ${banReason}\n\n${body.allowAppeal !== false ? 'You can appeal this decision through your account settings.' : 'This decision is final and cannot be appealed.'}`
        };
        break;
      
      case 'unban':
        if (!targetUser.banned) {
          return NextResponse.json(
            { success: false, error: 'User is not banned' },
            { status: 400 }
          );
        }
        
        const unbanBody = await request.json();
        const unbanReason = validateAndSanitize.string(unbanBody.reason, {
          required: true,
          maxLength: 500
        });
        
        updateData = {
          banned: false,
          isActive: true,
          'adminMetadata.accountStatus': 'active',
          'adminMetadata.riskLevel': 'medium', // Set to medium for monitoring
          'adminMetadata.unbanDetails': {
            reason: unbanReason,
            unbannedBy: auth.user._id,
            unbannedAt: new Date(),
            previousBanDetails: targetUser.adminMetadata?.banDetails
          },
          'adminMetadata.lastModifiedBy': auth.user._id,
          'adminMetadata.lastModifiedAt': new Date(),
          $unset: {
            bannedReason: 1,
            bannedAt: 1,
            bannedBy: 1,
            'adminMetadata.banDetails': 1
          }
        };
        
        successMessage = 'User unbanned successfully';
        shouldSendNotification = true;
        notificationData = {
          type: 'account_unbanned',
          title: 'Account Reactivated',
          message: `Your account has been reactivated. Please review our terms of service to ensure continued compliance.\n\nUnban reason: ${unbanReason}`
        };
        break;
      
      case 'suspend':
        const suspendBody = await request.json();
        
        const suspendReason = validateAndSanitize.string(suspendBody.reason, {
          required: true,
          maxLength: 500
        });
        
        const suspendDuration = validateAndSanitize.number(suspendBody.duration, {
          min: 1,
          max: 90,
          required: true
        });
        
        const suspendUnit = validateAndSanitize.string(suspendBody.unit, {
          enum: ['hours', 'days', 'weeks'],
          required: true
        }) || 'days';
        
        let suspendMultiplier;
        switch (suspendUnit) {
          case 'hours': suspendMultiplier = 60 * 60 * 1000; break;
          case 'days': suspendMultiplier = 24 * 60 * 60 * 1000; break;
          case 'weeks': suspendMultiplier = 7 * 24 * 60 * 60 * 1000; break;
        }
        
        const suspendUntil = new Date(Date.now() + suspendDuration * suspendMultiplier);
        
        updateData = {
          'adminMetadata.accountStatus': 'suspended',
          'adminMetadata.suspensionReason': suspendReason,
          'adminMetadata.suspendedUntil': suspendUntil,
          'adminMetadata.suspendedBy': auth.user._id,
          'adminMetadata.suspendedAt': new Date(),
          'adminMetadata.lastModifiedBy': auth.user._id,
          'adminMetadata.lastModifiedAt': new Date(),
          isActive: false
        };
        
        successMessage = `User suspended for ${suspendDuration} ${suspendUnit}`;
        shouldSendNotification = true;
        notificationData = {
          type: 'account_suspended',
          title: 'Account Temporarily Suspended',
          message: `Your account has been temporarily suspended until ${suspendUntil.toLocaleDateString()}.\n\nReason: ${suspendReason}\n\nYour account will be automatically reactivated after the suspension period.`
        };
        break;
      
      case 'verify':
        const verifyBody = await request.json();
        const verificationLevel = validateAndSanitize.string(verifyBody.level, {
          enum: ['basic', 'verified', 'premium'],
          required: true
        });
        
        updateData = {
          isVerified: true,
          emailVerified: true,
          phoneVerified: true,
          'adminMetadata.verificationLevel': verificationLevel,
          'adminMetadata.verifiedBy': auth.user._id,
          'adminMetadata.verifiedAt': new Date(),
          'adminMetadata.lastModifiedBy': auth.user._id,
          'adminMetadata.lastModifiedAt': new Date()
        };
        
        successMessage = `User verified at ${verificationLevel} level`;
        shouldSendNotification = true;
        notificationData = {
          type: 'account_verified',
          title: 'Account Verified',
          message: `Congratulations! Your account has been verified at ${verificationLevel} level. You now have access to additional features and increased trust rating.`
        };
        break;
      
      case 'unverify':
        const unverifyBody = await request.json();
        const unverifyReason = validateAndSanitize.string(unverifyBody.reason, {
          required: true,
          maxLength: 500
        });
        
        updateData = {
          isVerified: false,
          'adminMetadata.verificationLevel': 'none',
          'adminMetadata.unverificationReason': unverifyReason,
          'adminMetadata.unverifiedBy': auth.user._id,
          'adminMetadata.unverifiedAt': new Date(),
          'adminMetadata.lastModifiedBy': auth.user._id,
          'adminMetadata.lastModifiedAt': new Date(),
          $unset: {
            'adminMetadata.verifiedBy': 1,
            'adminMetadata.verifiedAt': 1
          }
        };
        
        successMessage = 'User verification removed';
        shouldSendNotification = true;
        notificationData = {
          type: 'account_unverified',
          title: 'Verification Removed',
          message: `Your account verification has been removed.\n\nReason: ${unverifyReason}\n\nYou can reapply for verification through your account settings.`
        };
        break;
        
      case 'flag':
        const flagBody = await request.json();
        const flagReason = validateAndSanitize.string(flagBody.reason, {
          required: true,
          maxLength: 500
        });
        const flagSeverity = validateAndSanitize.string(flagBody.severity, {
          enum: ['low', 'medium', 'high', 'critical']
        }) || 'medium';
        
        updateData = {
          $push: {
            'adminMetadata.flaggedBy': {
              userId: auth.user._id,
              reason: flagReason,
              severity: flagSeverity,
              flaggedAt: new Date(),
              status: 'pending'
            }
          },
          $set: {
            'adminMetadata.lastModifiedBy': auth.user._id,
            'adminMetadata.lastModifiedAt': new Date()
          }
        };
        
        successMessage = 'User flagged for review';
        break;
        
      case 'note':
        const noteBody = await request.json();
        const newAdminNote = validateAndSanitize.string(noteBody.note, {
          required: true,
          maxLength: 1000
        });
        
        updateData = {
          'adminMetadata.adminNotes': newAdminNote,
          'adminMetadata.lastModifiedBy': auth.user._id,
          'adminMetadata.lastModifiedAt': new Date()
        };
        
        successMessage = 'Admin note added';
        break;
      
      case 'view':
        // Return comprehensive user details for admin viewing
        const userDetails = await User.findById(userId).lean();
        
        // Get related statistics
        const [jobsCreated, jobsAssigned, totalEarnings, recentActivity] = await Promise.all([
          Job.countDocuments({ createdBy: userId }),
          Job.countDocuments({ assignedTo: userId }),
          Job.aggregate([
            { $match: { assignedTo: userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$budget.amount' } } }
          ]).then(result => result[0]?.total || 0),
          Job.find({ 
            $or: [{ createdBy: userId }, { assignedTo: userId }] 
          })
          .sort({ updatedAt: -1 })
          .limit(10)
          .select('title status updatedAt')
          .lean()
        ]);
        
        // Get location records
        const db = await connectToDatabase();
        const locationRecords = await db.collection('userlocations')
          .find({ userId: userId })
          .sort({ timestamp: -1 })
          .limit(5)
          .toArray();
        
        const response = NextResponse.json({
          success: true,
          data: {
            user: userDetails,
            statistics: {
              jobsCreated,
              jobsAssigned,
              totalEarnings,
              accountAge: Math.floor((Date.now() - userDetails.createdAt) / (1000 * 60 * 60 * 24)),
              lastActiveAgo: userDetails.lastActivityAt ? 
                Math.floor((Date.now() - userDetails.lastActivityAt) / (1000 * 60 * 60 * 24)) : null
            },
            recentActivity,
            locationRecords,
            timestamp: new Date().toISOString()
          }
        });
        
        // Log view action
        setTimeout(() => {
          db.collection('admin_audit_log').insertOne({
            adminId: auth.user._id,
            adminUsername: auth.session.user.username,
            action: 'user_profile_viewed',
            targetUserId: userId,
            targetUsername: userDetails.username,
            timestamp: new Date(),
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
          }).catch(err => console.warn('Audit log failed:', err.name));
        }, 0);
        
        return addSecurityHeaders(response);
      
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Allowed: ban, unban, suspend, verify, unverify, flag, note, view' 
          },
          { status: 400 }
        );
    }

    // Apply the update (except for 'view' action)
    if (action !== 'view') {
      const result = await User.findByIdAndUpdate(
        userId, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Failed to update user' },
          { status: 500 }
        );
      }
      
      // Send notification to user if required
      if (shouldSendNotification) {
        try {
          await User.findByIdAndUpdate(userId, {
            $push: {
              notifications: {
                ...notificationData,
                data: { actionBy: auth.session.user.username },
                createdAt: new Date()
              }
            }
          });
        } catch (notifError) {
          console.warn('Failed to send notification:', notifError.name);
        }
      }
      
      // Log admin action for comprehensive audit trail
      setTimeout(() => {
        connectToDatabase().then(db => {
          db.collection('admin_audit_log').insertOne({
            adminId: auth.user._id,
            adminUsername: auth.session.user.username,
            action: `user_${action}`,
            targetUserId: userId,
            targetUsername: targetUser.username,
            targetEmail: targetUser.email,
            details: {
              reason: updateData.bannedReason || updateData['adminMetadata.suspensionReason'] || updateData['adminMetadata.unverificationReason'],
              duration: updateData['adminMetadata.banDetails']?.expiresAt || updateData['adminMetadata.suspendedUntil'],
              type: updateData['adminMetadata.banDetails']?.type,
              category: updateData['adminMetadata.banDetails']?.category,
              severity: updateData['adminMetadata.banDetails']?.severity || updateData['adminMetadata.flaggedBy']?.[0]?.severity,
              verificationLevel: updateData['adminMetadata.verificationLevel']
            },
            timestamp: new Date(),
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            userAgent: request.headers.get('user-agent')
          });
        }).catch(err => console.warn('Audit log failed:', err.name));
      }, 0);
    }

    const response = NextResponse.json({
      success: true,
      message: successMessage,
      timestamp: new Date().toISOString()
    });
    
    return addSecurityHeaders(response);

  } catch (error) {
    console.error(`Admin user ${params.action} error:`, error.name, error.message);
    
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: `Failed to ${params.action} user`,
        code: `ADMIN_USER_${params.action.toUpperCase()}_ERROR`
      },
      { status: 500 }
    );
    
    return addSecurityHeaders(errorResponse);
  }
}