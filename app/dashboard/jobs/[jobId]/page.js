'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  User,
  Star,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Phone,
  Mail,
  Loader
} from 'lucide-react';
import { useApp } from '../../../providers';
import { toast } from 'sonner';

export default function JobDetailsPage({ params }) {
  const { jobId } = params;
  const { user } = useApp();
  const router = useRouter();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (response.ok) {
        setJob(data.job);
      } else {
        toast.error(data.message || 'Failed to load job details');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApply = async () => {
    if (!user?.canApplyToJob()) {
      toast.error('You need to upgrade to Pro to apply to more jobs');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedAmount: job.budget.amount || 1000,
          coverLetter: 'I am interested in this job and would like to discuss the details.'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Application sent successfully!');
        setJob(prev => ({ ...prev, hasApplied: true }));
      } else {
        toast.error(data.message || 'Failed to apply');
      }
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to apply to job');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="animate-spin h-8 w-8 text-fixly-accent" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-fixly-text mb-2">Job Not Found</h2>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="btn-ghost mr-4 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-fixly-text">{job.title}</h1>
          <p className="text-fixly-text-muted">Posted by {job.createdBy.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="card">
            <h2 className="text-xl font-semibold text-fixly-text mb-4">Job Description</h2>
            <p className="text-fixly-text-light leading-relaxed">{job.description}</p>
          </div>

          {/* Skills Required */}
          <div className="card">
            <h2 className="text-xl font-semibold text-fixly-text mb-4">Skills Required</h2>
            <div className="flex flex-wrap gap-2">
              {job.skillsRequired.map((skill, index) => (
                <span key={index} className="skill-chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="card">
            <h2 className="text-xl font-semibold text-fixly-text mb-4">Location</h2>
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-fixly-accent mr-2 mt-1" />
              <div>
                <p className="font-medium text-fixly-text">{job.location.city}, {job.location.state}</p>
                {job.location.address && (
                  <p className="text-fixly-text-muted text-sm mt-1">{job.location.address}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-semibold text-fixly-text mb-4">Job Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Budget</span>
                <span className="font-medium text-fixly-text">
                  {job.budget.type === 'negotiable' 
                    ? 'Negotiable' 
                    : `₹${job.budget.amount?.toLocaleString()}`
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Urgency</span>
                <span className="font-medium text-fixly-text capitalize">{job.urgency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Deadline</span>
                <span className="font-medium text-fixly-text">
                  {new Date(job.deadline).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fixly-text-muted">Applications</span>
                <span className="font-medium text-fixly-text">{job.applicationCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Hirer Info */}
          <div className="card">
            <h3 className="font-semibold text-fixly-text mb-4">Posted By</h3>
            <div className="flex items-center mb-3">
              <img
                src={job.createdBy.photoURL || '/default-avatar.png'}
                alt={job.createdBy.name}
                className="h-12 w-12 rounded-full object-cover mr-3"
              />
              <div>
                <p className="font-medium text-fixly-text">{job.createdBy.name}</p>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-sm text-fixly-text-muted">
                    {job.createdBy.rating?.average?.toFixed(1) || 'New'} 
                    {job.createdBy.rating?.count && ` (${job.createdBy.rating.count} reviews)`}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-fixly-text-muted mb-4">
              {job.createdBy.location?.city}, {job.createdBy.location?.state}
            </p>
          </div>

          {/* Actions */}
          {user?.role === 'fixer' && (
            <div className="card">
              <h3 className="font-semibold text-fixly-text mb-4">Apply to Job</h3>
              {job.hasApplied ? (
                <div className="flex items-center text-green-600 mb-4">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Application Sent
                </div>
              ) : (
                <button
                  onClick={handleQuickApply}
                  disabled={applying || !user?.canApplyToJob()}
                  className="btn-primary w-full mb-4"
                >
                  {applying ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Quick Apply
                </button>
              )}
              
              <button
                onClick={() => router.push(`/dashboard/jobs/${jobId}/messages`)}
                className="btn-secondary w-full flex items-center justify-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Hirer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
