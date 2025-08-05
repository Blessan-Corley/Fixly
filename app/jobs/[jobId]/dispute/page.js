'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Send,
  Upload,
  X,
  FileText,
  Image,
  DollarSign,
  Clock,
  User,
  MapPin,
  Calendar,
  Loader,
  AlertCircle,
  Shield,
  Scale,
  MessageSquare,
  Camera,
  File
} from 'lucide-react';
import { toast } from 'sonner';

export default function CreateDisputePage() {
  const { jobId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [disputeData, setDisputeData] = useState({
    category: '',
    subcategory: '',
    title: '',
    description: '',
    desiredOutcome: '',
    desiredOutcomeDetails: '',
    disputedAmount: '',
    refundRequested: '',
    additionalPaymentRequested: '',
    evidence: []
  });

  const disputeCategories = [
    { value: 'payment_issue', label: 'Payment Issue', description: 'Problems with payment processing or amounts' },
    { value: 'work_quality', label: 'Work Quality', description: 'Issues with the quality of work delivered' },
    { value: 'communication_problem', label: 'Communication Problem', description: 'Poor or lack of communication' },
    { value: 'scope_disagreement', label: 'Scope Disagreement', description: 'Disagreement about project scope' },
    { value: 'timeline_issue', label: 'Timeline Issue', description: 'Delays or timeline disagreements' },
    { value: 'unprofessional_behavior', label: 'Unprofessional Behavior', description: 'Inappropriate conduct' },
    { value: 'contract_violation', label: 'Contract Violation', description: 'Violation of agreed terms' },
    { value: 'safety_concern', label: 'Safety Concern', description: 'Safety issues or violations' },
    { value: 'other', label: 'Other', description: 'Other issues not listed above' }
  ];

  const desiredOutcomes = [
    { value: 'refund', label: 'Full Refund', description: 'Request a complete refund of payment' },
    { value: 'partial_refund', label: 'Partial Refund', description: 'Request a partial refund' },
    { value: 'work_completion', label: 'Work Completion', description: 'Request work to be completed as agreed' },
    { value: 'work_revision', label: 'Work Revision', description: 'Request work to be revised or corrected' },
    { value: 'additional_payment', label: 'Additional Payment', description: 'Request additional payment for extra work' },
    { value: 'mediation', label: 'Mediation', description: 'Request mediation to resolve the issue' },
    { value: 'other', label: 'Other', description: 'Other resolution not listed above' }
  ];

  useEffect(() => {
    if (session && jobId) {
      fetchJobDetails();
    }
  }, [session, jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (data.success) {
        setJob(data.job);
        
        // Check if user can create disputes for this job
        const isClient = data.job.client._id === session.user.id;
        const isFixer = data.job.fixer && data.job.fixer._id === session.user.id;

        if (!isClient && !isFixer) {
          toast.error('You can only create disputes for jobs you are involved in');
          router.push(`/jobs/${jobId}`);
          return;
        }
      } else {
        toast.error(data.message || 'Failed to fetch job details');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to fetch job details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleEvidenceUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const evidence = {
          id: Date.now() + Math.random(),
          type: file.type.startsWith('image/') ? 'image' : 'document',
          url: e.target.result,
          filename: file.name,
          description: ''
        };

        setDisputeData(prev => ({
          ...prev,
          evidence: [...prev.evidence, evidence]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidence = (evidenceId) => {
    setDisputeData(prev => ({
      ...prev,
      evidence: prev.evidence.filter(e => e.id !== evidenceId)
    }));
  };

  const updateEvidenceDescription = (evidenceId, description) => {
    setDisputeData(prev => ({
      ...prev,
      evidence: prev.evidence.map(e =>
        e.id === evidenceId ? { ...e, description } : e
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!disputeData.category || !disputeData.title || !disputeData.description || !disputeData.desiredOutcome) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const isClient = job.client._id === session.user.id;
      const againstUserId = isClient ? job.fixer._id : job.client._id;

      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          againstUserId,
          category: disputeData.category,
          subcategory: disputeData.subcategory,
          title: disputeData.title,
          description: disputeData.description,
          desiredOutcome: disputeData.desiredOutcome,
          desiredOutcomeDetails: disputeData.desiredOutcomeDetails,
          disputedAmount: disputeData.disputedAmount ? parseFloat(disputeData.disputedAmount) : undefined,
          refundRequested: disputeData.refundRequested ? parseFloat(disputeData.refundRequested) : undefined,
          additionalPaymentRequested: disputeData.additionalPaymentRequested ? parseFloat(disputeData.additionalPaymentRequested) : undefined,
          evidence: disputeData.evidence.map(e => ({
            type: e.type,
            url: e.url,
            filename: e.filename,
            description: e.description
          }))
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Dispute submitted successfully!');
        router.push(`/dashboard/disputes/${data.dispute.disputeId}`);
      } else {
        toast.error(data.message || 'Failed to submit dispute');
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
      toast.error('Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-fixly-text">Job not found</h1>
        </div>
      </div>
    );
  }

  const otherParty = job.client._id === session.user.id ? job.fixer : job.client;

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-fixly-text-light hover:text-fixly-accent mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Job
          </button>
          
          <div className="flex items-center mb-4">
            <div className="p-3 bg-red-100 rounded-lg mr-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-fixly-text mb-2">
                Create Dispute
              </h1>
              <p className="text-fixly-text-light">
                File a dispute to resolve issues with this job
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  Before Filing a Dispute
                </h3>
                <p className="text-sm text-blue-700">
                  We recommend trying to resolve the issue directly with the other party first. 
                  Disputes should be used when direct communication has failed to resolve the matter.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Job Details</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-fixly-text">{job.title}</h4>
                  <p className="text-sm text-fixly-text-light capitalize">{job.category}</p>
                </div>

                <div className="flex items-center text-sm text-fixly-text-light">
                  <MapPin className="h-4 w-4 mr-2" />
                  {job.location.address}
                </div>

                <div className="flex items-center text-sm text-fixly-text-light">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ₹{job.budget.amount.toLocaleString()}
                </div>

                <div className="flex items-center text-sm text-fixly-text-light">
                  <Calendar className="h-4 w-4 mr-2" />
                  Status: <span className="capitalize ml-1">{job.status}</span>
                </div>

                {/* Other Party Info */}
                <div className="pt-4 border-t border-fixly-border">
                  <h4 className="text-sm font-medium text-fixly-text mb-3">Other Party</h4>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-fixly-accent-light rounded-full flex items-center justify-center">
                      {otherParty.photoURL ? (
                        <img
                          src={otherParty.photoURL}
                          alt={otherParty.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-fixly-accent" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium text-fixly-text">{otherParty.name}</h5>
                      <p className="text-sm text-fixly-text-light">@{otherParty.username}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dispute Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Category Selection */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Dispute Category</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {disputeCategories.map((category) => (
                    <label
                      key={category.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        disputeData.category === category.value
                          ? 'border-fixly-accent bg-fixly-accent-light'
                          : 'border-fixly-border hover:border-fixly-accent-light'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={category.value}
                        checked={disputeData.category === category.value}
                        onChange={(e) => setDisputeData(prev => ({ ...prev, category: e.target.value }))}
                        className="sr-only"
                      />
                      <div>
                        <h4 className="font-medium text-fixly-text">{category.label}</h4>
                        <p className="text-sm text-fixly-text-light mt-1">{category.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {disputeData.category && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Subcategory (Optional)
                    </label>
                    <input
                      type="text"
                      value={disputeData.subcategory}
                      onChange={(e) => setDisputeData(prev => ({ ...prev, subcategory: e.target.value }))}
                      placeholder="More specific category..."
                      className="input-field"
                      maxLength={100}
                    />
                  </div>
                )}
              </div>

              {/* Dispute Details */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Dispute Details</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Dispute Title *
                    </label>
                    <input
                      type="text"
                      value={disputeData.title}
                      onChange={(e) => setDisputeData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief summary of the issue"
                      className="input-field"
                      maxLength={150}
                      required
                    />
                    <p className="text-xs text-fixly-text-light mt-1">
                      {disputeData.title.length}/150 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Detailed Description *
                    </label>
                    <textarea
                      value={disputeData.description}
                      onChange={(e) => setDisputeData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Provide a detailed explanation of the issue, including what happened, when it occurred, and any relevant context..."
                      className="input-field"
                      rows={6}
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-fixly-text-light mt-1">
                      {disputeData.description.length}/2000 characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Desired Outcome */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Desired Resolution</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-3">
                      What outcome are you seeking? *
                    </label>
                    <div className="space-y-3">
                      {desiredOutcomes.map((outcome) => (
                        <label
                          key={outcome.value}
                          className={`p-3 border rounded-lg cursor-pointer flex items-start space-x-3 transition-colors ${
                            disputeData.desiredOutcome === outcome.value
                              ? 'border-fixly-accent bg-fixly-accent-light'
                              : 'border-fixly-border hover:border-fixly-accent-light'
                          }`}
                        >
                          <input
                            type="radio"
                            name="desiredOutcome"
                            value={outcome.value}
                            checked={disputeData.desiredOutcome === outcome.value}
                            onChange={(e) => setDisputeData(prev => ({ ...prev, desiredOutcome: e.target.value }))}
                            className="mt-1"
                            required
                          />
                          <div>
                            <h4 className="font-medium text-fixly-text">{outcome.label}</h4>
                            <p className="text-sm text-fixly-text-light">{outcome.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Additional Details
                    </label>
                    <textarea
                      value={disputeData.desiredOutcomeDetails}
                      onChange={(e) => setDisputeData(prev => ({ ...prev, desiredOutcomeDetails: e.target.value }))}
                      placeholder="Provide more details about your desired resolution..."
                      className="input-field"
                      rows={3}
                      maxLength={1000}
                    />
                  </div>

                  {/* Amount Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-fixly-text mb-2">
                        Disputed Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={disputeData.disputedAmount}
                        onChange={(e) => setDisputeData(prev => ({ ...prev, disputedAmount: e.target.value }))}
                        placeholder="0"
                        className="input-field"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fixly-text mb-2">
                        Refund Requested (₹)
                      </label>
                      <input
                        type="number"
                        value={disputeData.refundRequested}
                        onChange={(e) => setDisputeData(prev => ({ ...prev, refundRequested: e.target.value }))}
                        placeholder="0"
                        className="input-field"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fixly-text mb-2">
                        Additional Payment (₹)
                      </label>
                      <input
                        type="number"
                        value={disputeData.additionalPaymentRequested}
                        onChange={(e) => setDisputeData(prev => ({ ...prev, additionalPaymentRequested: e.target.value }))}
                        placeholder="0"
                        className="input-field"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Upload */}
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-6">Supporting Evidence</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-3">
                      Upload Evidence (Optional)
                    </label>
                    <p className="text-sm text-fixly-text-light mb-4">
                      Upload screenshots, photos, documents, or other files that support your dispute.
                      Maximum file size: 10MB per file.
                    </p>
                    
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-fixly-border border-dashed rounded-lg cursor-pointer hover:border-fixly-accent transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-fixly-text-light mb-2" />
                        <p className="text-sm text-fixly-text-light">
                          <span className="font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-fixly-text-muted">
                          Images, PDFs, documents (max 10MB each)
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleEvidenceUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {disputeData.evidence.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-fixly-text">Uploaded Evidence</h4>
                      {disputeData.evidence.map((evidence) => (
                        <div key={evidence.id} className="flex items-start space-x-3 p-3 border border-fixly-border rounded-lg">
                          <div className="flex-shrink-0">
                            {evidence.type === 'image' ? (
                              <Image className="h-5 w-5 text-blue-500" />
                            ) : (
                              <File className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-fixly-text truncate">
                              {evidence.filename}
                            </p>
                            <input
                              type="text"
                              value={evidence.description}
                              onChange={(e) => updateEvidenceDescription(evidence.id, e.target.value)}
                              placeholder="Add a description for this evidence..."
                              className="mt-2 w-full px-2 py-1 text-sm border border-fixly-border rounded focus:outline-none focus:ring-1 focus:ring-fixly-accent"
                              maxLength={500}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEvidence(evidence.id)}
                            className="flex-shrink-0 text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="card">
                <div className="flex items-start space-x-3 mb-6">
                  <Scale className="h-5 w-5 text-fixly-accent mt-1" />
                  <div>
                    <h4 className="font-medium text-fixly-text mb-2">Legal Notice</h4>
                    <p className="text-sm text-fixly-text-light">
                      By submitting this dispute, you confirm that the information provided is accurate 
                      and you understand that false claims may result in account penalties. This dispute 
                      will be reviewed by our moderation team and may be subject to mediation or arbitration.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !disputeData.category || !disputeData.title || !disputeData.description || !disputeData.desiredOutcome}
                    className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <Loader className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Send className="h-5 w-5 mr-2" />
                    )}
                    {submitting ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}