'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Scale,
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageSquare,
  Send,
  User,
  Calendar,
  DollarSign,
  FileText,
  Image,
  Download,
  Flag,
  Shield,
  Eye,
  Reply,
  AlertCircle,
  Loader,
  Edit,
  Check,
  X,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function DisputeDetailPage() {
  const { disputeId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const messagesEndRef = useRef(null);
  
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseData, setResponseData] = useState({
    content: '',
    acknowledgement: 'dispute',
    counterClaim: {
      category: '',
      description: '',
      desiredOutcome: '',
      amount: ''
    }
  });

  useEffect(() => {
    if (session && disputeId) {
      fetchDispute();
    }
  }, [session, disputeId]);

  useEffect(() => {
    scrollToBottom();
  }, [dispute?.messages]);

  const fetchDispute = async () => {
    try {
      const response = await fetch(`/api/disputes/${disputeId}`);
      const data = await response.json();

      if (data.success) {
        setDispute(data.dispute);
        
        // Check if user can respond and hasn't responded yet
        if (data.dispute.againstUser._id === session.user.id && 
            data.dispute.status === 'awaiting_response' &&
            !data.dispute.response?.respondedBy) {
          setShowResponseForm(true);
        }
      } else {
        toast.error(data.message || 'Failed to fetch dispute');
        router.push('/dashboard/disputes');
      }
    } catch (error) {
      console.error('Error fetching dispute:', error);
      toast.error('Failed to fetch dispute');
      router.push('/dashboard/disputes');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh dispute to get updated messages
        await fetchDispute();
        toast.success('Message sent successfully');
      } else {
        toast.error(data.message || 'Failed to send message');
        setNewMessage(messageContent); // Restore message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent); // Restore message
    } finally {
      setSendingMessage(false);
    }
  };

  const submitResponse = async () => {
    if (!responseData.content.trim()) {
      toast.error('Response content is required');
      return;
    }

    setSubmittingResponse(true);

    try {
      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Response submitted successfully');
        setShowResponseForm(false);
        await fetchDispute();
      } else {
        toast.error(data.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusIcon = (status) => {
    const iconClass = "h-5 w-5";
    switch (status) {
      case 'pending': return <Clock className={`${iconClass} text-yellow-500`} />;
      case 'under_review': return <Eye className={`${iconClass} text-blue-500`} />;
      case 'awaiting_response': return <MessageSquare className={`${iconClass} text-orange-500`} />;
      case 'in_mediation': return <Scale className={`${iconClass} text-fixly-primary`} />;
      case 'resolved': return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'escalated': return <Flag className={`${iconClass} text-red-500`} />;
      default: return <AlertTriangle className={`${iconClass} text-gray-400`} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'awaiting_response': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'in_mediation': return 'bg-fixly-accent/20 text-fixly-primary border-fixly-accent/30';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'escalated': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-fixly-accent" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-fixly-text">Dispute not found</h1>
        </div>
      </div>
    );
  }

  const isInitiator = dispute.initiatedBy._id === session.user.id;
  const otherParty = isInitiator ? dispute.againstUser : dispute.initiatedBy;
  const canRespond = dispute.againstUser._id === session.user.id && 
                    dispute.status === 'awaiting_response' && 
                    !dispute.response?.respondedBy;

  return (
    <div className="min-h-screen bg-fixly-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/disputes')}
            className="flex items-center text-fixly-text-light hover:text-fixly-accent mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Disputes
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Scale className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-fixly-text mb-2">
                  {dispute.title}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(dispute.status)}`}>
                    {getStatusIcon(dispute.status)}
                    <span className="ml-2">{dispute.status.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="text-sm text-fixly-text-light">
                    #{dispute.disputeId}
                  </span>
                  <span className="text-sm text-fixly-text-light">
                    {formatDate(dispute.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Dispute Details */}
            <div className="card">
              <h2 className="text-xl font-semibold text-fixly-text mb-4">Dispute Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-fixly-text mb-2">Description</h3>
                  <p className="text-fixly-text-light leading-relaxed">{dispute.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-fixly-text mb-2">Category</h3>
                    <p className="text-fixly-text-light capitalize">
                      {dispute.category.replace(/_/g, ' ')}
                      {dispute.subcategory && ` - ${dispute.subcategory}`}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-fixly-text mb-2">Desired Outcome</h3>
                    <p className="text-fixly-text-light capitalize">
                      {dispute.desiredOutcome.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                {dispute.desiredOutcomeDetails && (
                  <div>
                    <h3 className="text-sm font-medium text-fixly-text mb-2">Additional Details</h3>
                    <p className="text-fixly-text-light">{dispute.desiredOutcomeDetails}</p>
                  </div>
                )}

                {/* Amount Information */}
                {dispute.amount && (dispute.amount.disputedAmount || dispute.amount.refundRequested || dispute.amount.additionalPaymentRequested) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-fixly-border">
                    {dispute.amount.disputedAmount && (
                      <div>
                        <h3 className="text-sm font-medium text-fixly-text mb-1">Disputed Amount</h3>
                        <p className="text-lg font-semibold text-fixly-text">
                          ₹{dispute.amount.disputedAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {dispute.amount.refundRequested && (
                      <div>
                        <h3 className="text-sm font-medium text-fixly-text mb-1">Refund Requested</h3>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{dispute.amount.refundRequested.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {dispute.amount.additionalPaymentRequested && (
                      <div>
                        <h3 className="text-sm font-medium text-fixly-text mb-1">Additional Payment</h3>
                        <p className="text-lg font-semibold text-blue-600">
                          ₹{dispute.amount.additionalPaymentRequested.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Evidence */}
            {dispute.evidence && dispute.evidence.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-fixly-text mb-4">Evidence</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dispute.evidence.map((evidence, index) => (
                    <div key={index} className="border border-fixly-border rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        {evidence.type === 'image' ? (
                          <Image className="h-5 w-5 text-blue-500" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-500" />
                        )}
                        <span className="font-medium text-fixly-text truncate">
                          {evidence.filename}
                        </span>
                        <button className="text-fixly-accent hover:text-fixly-accent-dark">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                      {evidence.description && (
                        <p className="text-sm text-fixly-text-light">{evidence.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Form */}
            {canRespond && showResponseForm && (
              <div className="card">
                <h2 className="text-xl font-semibold text-fixly-text mb-4">Submit Response</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-2">
                      Your Response *
                    </label>
                    <textarea
                      value={responseData.content}
                      onChange={(e) => setResponseData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Provide your response to this dispute..."
                      className="input-field"
                      rows={5}
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-fixly-text-light mt-1">
                      {responseData.content.length}/2000 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fixly-text mb-3">
                      How do you respond to this dispute? *
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 p-3 border border-fixly-border rounded-lg cursor-pointer hover:border-fixly-accent">
                        <input
                          type="radio"
                          name="acknowledgement"
                          value="acknowledge"
                          checked={responseData.acknowledgement === 'acknowledge'}
                          onChange={(e) => setResponseData(prev => ({ ...prev, acknowledgement: e.target.value }))}
                          className="mt-1"
                        />
                        <div>
                          <h4 className="font-medium text-fixly-text">Acknowledge</h4>
                          <p className="text-sm text-fixly-text-light">
                            I acknowledge the validity of this dispute and agree to the proposed resolution
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 p-3 border border-fixly-border rounded-lg cursor-pointer hover:border-fixly-accent">
                        <input
                          type="radio"
                          name="acknowledgement"
                          value="dispute"
                          checked={responseData.acknowledgement === 'dispute'}
                          onChange={(e) => setResponseData(prev => ({ ...prev, acknowledgement: e.target.value }))}
                          className="mt-1"
                        />
                        <div>
                          <h4 className="font-medium text-fixly-text">Dispute</h4>
                          <p className="text-sm text-fixly-text-light">
                            I dispute these claims and request mediation to resolve this matter
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 p-3 border border-fixly-border rounded-lg cursor-pointer hover:border-fixly-accent">
                        <input
                          type="radio"
                          name="acknowledgement"
                          value="counter_claim"
                          checked={responseData.acknowledgement === 'counter_claim'}
                          onChange={(e) => setResponseData(prev => ({ ...prev, acknowledgement: e.target.value }))}
                          className="mt-1"
                        />
                        <div>
                          <h4 className="font-medium text-fixly-text">Counter Claim</h4>
                          <p className="text-sm text-fixly-text-light">
                            I dispute these claims and have my own counter claim to make
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {responseData.acknowledgement === 'counter_claim' && (
                    <div className="p-4 bg-fixly-bg rounded-lg space-y-4">
                      <h4 className="font-medium text-fixly-text">Counter Claim Details</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-fixly-text mb-2">
                          Counter Claim Category
                        </label>
                        <input
                          type="text"
                          value={responseData.counterClaim.category}
                          onChange={(e) => setResponseData(prev => ({
                            ...prev,
                            counterClaim: { ...prev.counterClaim, category: e.target.value }
                          }))}
                          placeholder="e.g., Payment Issue"
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-fixly-text mb-2">
                          Description
                        </label>
                        <textarea
                          value={responseData.counterClaim.description}
                          onChange={(e) => setResponseData(prev => ({
                            ...prev,
                            counterClaim: { ...prev.counterClaim, description: e.target.value }
                          }))}
                          placeholder="Describe your counter claim..."
                          className="input-field"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-fixly-text mb-2">
                            Desired Outcome
                          </label>
                          <input
                            type="text"
                            value={responseData.counterClaim.desiredOutcome}
                            onChange={(e) => setResponseData(prev => ({
                              ...prev,
                              counterClaim: { ...prev.counterClaim, desiredOutcome: e.target.value }
                            }))}
                            placeholder="What resolution do you seek?"
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-fixly-text mb-2">
                            Amount (₹)
                          </label>
                          <input
                            type="number"
                            value={responseData.counterClaim.amount}
                            onChange={(e) => setResponseData(prev => ({
                              ...prev,
                              counterClaim: { ...prev.counterClaim, amount: e.target.value }
                            }))}
                            placeholder="0"
                            className="input-field"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowResponseForm(false)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitResponse}
                      disabled={submittingResponse || !responseData.content.trim()}
                      className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingResponse ? (
                        <Loader className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <Send className="h-5 w-5 mr-2" />
                      )}
                      {submittingResponse ? 'Submitting...' : 'Submit Response'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Response Display */}
            {dispute.response && dispute.response.respondedBy && (
              <div className="card">
                <h2 className="text-xl font-semibold text-fixly-text mb-4">Response</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-8 w-8 bg-fixly-accent-light rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-fixly-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-fixly-text">
                        {otherParty.name}
                      </h3>
                      <p className="text-sm text-fixly-text-light">
                        {formatDate(dispute.response.respondedAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      dispute.response.acknowledgement === 'acknowledge' ? 'bg-green-100 text-green-800' :
                      dispute.response.acknowledgement === 'counter_claim' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {dispute.response.acknowledgement.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-4 bg-fixly-bg rounded-lg">
                    <p className="text-fixly-text-light">{dispute.response.content}</p>
                  </div>

                  {dispute.response.counterClaim && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">Counter Claim</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Category:</strong> {dispute.response.counterClaim.category}</p>
                        <p><strong>Description:</strong> {dispute.response.counterClaim.description}</p>
                        <p><strong>Desired Outcome:</strong> {dispute.response.counterClaim.desiredOutcome}</p>
                        {dispute.response.counterClaim.amount && (
                          <p><strong>Amount:</strong> ₹{dispute.response.counterClaim.amount.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="card">
              <h2 className="text-xl font-semibold text-fixly-text mb-4">
                Discussion ({dispute.messages?.length || 0})
              </h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {dispute.messages && dispute.messages.length > 0 ? (
                  dispute.messages.map((message, index) => {
                    const isOwnMessage = message.sender._id === session.user.id;
                    
                    return (
                      <div
                        key={index}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isOwnMessage 
                            ? 'bg-fixly-accent text-white' 
                            : 'bg-fixly-bg text-fixly-text'
                        }`}>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium">
                              {message.sender.name}
                            </span>
                            {message.senderType === 'admin' && (
                              <Shield className="h-3 w-3 text-red-400" />
                            )}
                            {message.senderType === 'moderator' && (
                              <Shield className="h-3 w-3 text-blue-400" />
                            )}
                          </div>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-white/70' : 'text-fixly-text-light'
                          }`}>
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-fixly-text-light mx-auto mb-4" />
                    <p className="text-fixly-text-light">No messages yet</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {dispute.status !== 'resolved' && dispute.status !== 'closed' && dispute.status !== 'cancelled' && (
                <div className="border-t border-fixly-border pt-4">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        rows={2}
                        className="w-full px-4 py-2 border border-fixly-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fixly-accent focus:border-transparent resize-none"
                        maxLength={2000}
                      />
                    </div>
                    
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="p-2 bg-fixly-accent text-white rounded-lg hover:bg-fixly-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Information */}
            <div className="card">
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Related Job</h3>
              
              {dispute.job ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-fixly-text">{dispute.job.title}</h4>
                    <p className="text-sm text-fixly-text-light capitalize">{dispute.job.category}</p>
                  </div>
                  
                  <div className="flex items-center text-sm text-fixly-text-light">
                    <DollarSign className="h-4 w-4 mr-2" />
                    ₹{dispute.job.budget?.amount?.toLocaleString() || 'Not specified'}
                  </div>
                  
                  <div className="flex items-center text-sm text-fixly-text-light">
                    <span className="capitalize">Status: {dispute.job.status}</span>
                  </div>

                  <button
                    onClick={() => router.push(`/jobs/${dispute.job._id}`)}
                    className="btn-ghost w-full text-sm"
                  >
                    View Job Details
                  </button>
                </div>
              ) : (
                <p className="text-fixly-text-light">Job information not available</p>
              )}
            </div>

            {/* Participants */}
            <div className="card">
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Participants</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-fixly-text mb-2">Initiated By</h4>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-fixly-accent-light rounded-full flex items-center justify-center">
                      {dispute.initiatedBy.photoURL ? (
                        <img
                          src={dispute.initiatedBy.photoURL}
                          alt={dispute.initiatedBy.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-fixly-accent" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium text-fixly-text">{dispute.initiatedBy.name}</h5>
                      <p className="text-sm text-fixly-text-light">@{dispute.initiatedBy.username}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-fixly-text mb-2">Against</h4>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-fixly-accent-light rounded-full flex items-center justify-center">
                      {dispute.againstUser.photoURL ? (
                        <img
                          src={dispute.againstUser.photoURL}
                          alt={dispute.againstUser.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-fixly-accent" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium text-fixly-text">{dispute.againstUser.name}</h5>
                      <p className="text-sm text-fixly-text-light">@{dispute.againstUser.username}</p>
                    </div>
                  </div>
                </div>

                {dispute.assignedModerator && (
                  <div>
                    <h4 className="text-sm font-medium text-fixly-text mb-2">Assigned Moderator</h4>
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Shield className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h5 className="font-medium text-fixly-text">{dispute.assignedModerator.name}</h5>
                        <p className="text-sm text-fixly-text-light capitalize">{dispute.assignedModerator.role}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <h3 className="text-lg font-semibold text-fixly-text mb-4">Timeline</h3>
              
              <div className="space-y-3">
                {dispute.timeline?.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-fixly-accent rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-fixly-text font-medium">
                        {entry.action.replace(/_/g, ' ')}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-fixly-text-light">{entry.description}</p>
                      )}
                      <p className="text-xs text-fixly-text-muted">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {canRespond && !showResponseForm && (
              <div className="card">
                <h3 className="text-lg font-semibold text-fixly-text mb-4">Actions</h3>
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  <Reply className="h-4 w-4 mr-2" />
                  Submit Response
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}