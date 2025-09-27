'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Plus,
  X,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Camera,
  Upload,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  AlertTriangle,
  Check,
  Star,
  User,
  Users,
  Search,
  Filter,
  Save,
  Share,
  Copy,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail,
  Loader,
  FolderOpen,
  Archive,
  Timer
} from 'lucide-react';
import { useApp, RoleGuard } from '../../providers';
import { toast } from 'sonner';
import { skillCategories } from '../../../data/cities';
import DeadlineSelector from '../../../components/ui/DeadlineSelector';
import SkillSelector from '../../../components/SkillSelector/SkillSelector';
import EnhancedLocationSelector from '../../../components/LocationPicker/EnhancedLocationSelector';

export default function PostJobPage() {
  return (
    <RoleGuard roles={['hirer']} fallback={<div>Access denied</div>}>
      <PostJobContent />
    </RoleGuard>
  );
}

function PostJobContent() {
  const { user } = useApp();
  const router = useRouter();
  
  // Form data - Updated to match new requirements
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skillsRequired: [],
    budget: {
      type: 'negotiable',
      amount: '',
      materialsIncluded: false
    },
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      lat: null,
      lng: null
    },
    deadline: '',
    urgency: 'flexible',
    scheduledDate: '',
    attachments: [] // Cloudinary media with isImage/isVideo flags
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Media upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragOver, setDragOver] = useState(false);
  
  // Subscription states
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Draft functionality states
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [draftStatus, setDraftStatus] = useState('unsaved'); // 'unsaved', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [availableDrafts, setAvailableDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState(null);

  // Real-time validation states (like signup form) - Background validation without loading indicators
  const [validationMessages, setValidationMessages] = useState({});
  const [fieldValidations, setFieldValidations] = useState({});
  const [locationDetected, setLocationDetected] = useState(false);


  // Fetch subscription info
  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);


  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch('/api/subscription/hirer');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionInfo(data);
      }
    } catch (error) {
      console.error('Error fetching subscription info:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Draft functionality functions
  const fetchUserDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const response = await fetch('/api/jobs/drafts?limit=10');
      if (response.ok) {
        const data = await response.json();
        setAvailableDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast.error('Failed to load drafts');
    } finally {
      setLoadingDrafts(false);
    }
  };

  const saveDraft = async (saveType = 'auto') => {
    if (draftStatus === 'saving') return;

    setDraftStatus('saving');
    try {
      const response = await fetch('/api/jobs/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: currentDraftId,
          formData,
          currentStep,
          saveType,
          completedSteps: []
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentDraftId(data.draft._id);
        setLastSaved(new Date());
        setDraftStatus('saved');
        setHasUnsavedChanges(false);

        if (saveType === 'manual') {
          toast.success('Draft saved successfully');
        }

        return data.draft;
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setDraftStatus('error');
      if (saveType === 'manual') {
        toast.error('Failed to save draft');
      }
    }
  };

  const loadDraft = async (draftId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/drafts/${draftId}`);
      if (response.ok) {
        const data = await response.json();
        const draft = data.draft;

        setFormData({
          title: draft.title || '',
          description: draft.description || '',
          skillsRequired: draft.skillsRequired || [],
          budget: draft.budget || { type: 'negotiable', amount: '', materialsIncluded: false },
          location: draft.location || {
            address: '', city: '', state: '', pincode: '', lat: null, lng: null
          },
          deadline: draft.deadline || '',
          urgency: draft.urgency || 'flexible',
          scheduledDate: draft.scheduledDate || '',
          attachments: draft.attachments || []
        });

        setCurrentStep(draft.currentStep || 1);
        setCurrentDraftId(draft._id);
        setLastSaved(new Date(draft.lastAutoSave || draft.lastManualSave));
        setDraftStatus('saved');
        setHasUnsavedChanges(false);
        setShowDraftModal(false);

        toast.success(`Draft "${draft.title || 'Untitled Job'}" loaded successfully`);
      } else {
        throw new Error('Failed to load draft');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Failed to load draft');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (draft) => {
    setDraftToDelete(draft);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;

    try {
      const response = await fetch(`/api/jobs/drafts?draftId=${draftToDelete._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAvailableDrafts(prev => prev.filter(draft => draft._id !== draftToDelete._id));
        if (currentDraftId === draftToDelete._id) {
          setCurrentDraftId(null);
          setDraftStatus('unsaved');
          setLastSaved(null);
        }
        toast.success('Draft deleted successfully');
      } else {
        throw new Error('Failed to delete draft');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Failed to delete draft');
    } finally {
      setShowDeleteConfirm(false);
      setDraftToDelete(null);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && !autoSaveInterval) {
      const interval = setInterval(async () => {
        await saveDraft('auto');
      }, 30000); // Auto-save every 30 seconds

      setAutoSaveInterval(interval);
    }

    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        setAutoSaveInterval(null);
      }
    };
  }, [hasUnsavedChanges, autoSaveInterval, formData, currentStep]);

  // Track form changes - set unsaved changes when form data changes
  useEffect(() => {
    // Only mark as unsaved if we have some content (not empty form)
    const hasContent = formData.title.trim() ||
                      formData.description.trim() ||
                      formData.skillsRequired.length > 0 ||
                      formData.attachments.length > 0;

    if (hasContent) {
      setHasUnsavedChanges(true);
      if (draftStatus === 'saved') {
        setDraftStatus('unsaved');
      }
    }
  }, [formData, currentStep]);

  // Load available drafts on component mount
  useEffect(() => {
    fetchUserDrafts();
  }, []);

  // Cleanup auto-save interval on unmount
  useEffect(() => {
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [autoSaveInterval]);

  // Real-time validation for title (like signup form)
  useEffect(() => {
    const validateTitle = async () => {
      if (!formData.title.trim()) {
        setValidationMessages(prev => ({ ...prev, title: '' }));
        setFieldValidations(prev => ({ ...prev, title: null }));
        return;
      }

      if (formData.title.length > 30) {
        setValidationMessages(prev => ({ ...prev, title: 'Title cannot exceed 30 characters' }));
        setFieldValidations(prev => ({ ...prev, title: false }));
        return;
      }

      if (formData.title.length < 10) {
        setValidationMessages(prev => ({ ...prev, title: 'Title must be at least 10 characters' }));
        setFieldValidations(prev => ({ ...prev, title: false }));
        return;
      }

      // Silent background validation - no loading indicators
      try {
        const contentValidation = await fetch('/api/validate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: formData.title,
            context: 'job_posting',
            userId: user?.id
          }),
        });

        if (contentValidation.ok) {
          const result = await contentValidation.json();
          if (!result.isValid && result.violations.length > 0) {
            const violationTypes = result.violations.map(v => v.type);
            let message = 'Title contains inappropriate content: ';

            if (violationTypes.includes('profanity') || violationTypes.includes('abuse')) {
              message += 'abuse words, ';
            }
            if (violationTypes.includes('phone_number')) {
              message += 'phone numbers, ';
            }
            if (violationTypes.includes('email_address')) {
              message += 'email addresses, ';
            }
            if (violationTypes.includes('url') || violationTypes.includes('social_media')) {
              message += 'links/social media, ';
            }

            message = message.replace(/, $/, '');
            setValidationMessages(prev => ({ ...prev, title: message }));
            setFieldValidations(prev => ({ ...prev, title: false }));
          } else {
            setValidationMessages(prev => ({ ...prev, title: '' }));
            setFieldValidations(prev => ({ ...prev, title: true }));
          }
        }
      } catch (error) {
        console.error('Title validation error:', error);
        // Silent error handling - don't show loading state errors
      }
    };

    const timer = setTimeout(validateTitle, 500);
    return () => clearTimeout(timer);
  }, [formData.title, user?.id]);

  // Real-time validation for description
  useEffect(() => {
    const validateDescription = async () => {
      if (!formData.description.trim()) {
        setValidationMessages(prev => ({ ...prev, description: '' }));
        setFieldValidations(prev => ({ ...prev, description: null }));
        return;
      }

      if (formData.description.length < 30) {
        setValidationMessages(prev => ({ ...prev, description: 'Description must be at least 30 characters' }));
        setFieldValidations(prev => ({ ...prev, description: false }));
        return;
      }

      // Silent background validation - no loading indicators
      try {
        const contentValidation = await fetch('/api/validate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: formData.description,
            context: 'job_posting',
            userId: user?.id
          }),
        });

        if (contentValidation.ok) {
          const result = await contentValidation.json();
          if (!result.isValid && result.violations.length > 0) {
            const violationTypes = result.violations.map(v => v.type);
            let message = 'Description contains inappropriate content: ';

            if (violationTypes.includes('profanity') || violationTypes.includes('abuse')) {
              message += 'abuse words, ';
            }
            if (violationTypes.includes('phone_number')) {
              message += 'phone numbers, ';
            }
            if (violationTypes.includes('email_address')) {
              message += 'email addresses, ';
            }
            if (violationTypes.includes('url') || violationTypes.includes('social_media')) {
              message += 'links/social media, ';
            }

            message = message.replace(/, $/, '');
            setValidationMessages(prev => ({ ...prev, description: message }));
            setFieldValidations(prev => ({ ...prev, description: false }));
          } else {
            setValidationMessages(prev => ({ ...prev, description: '' }));
            setFieldValidations(prev => ({ ...prev, description: true }));
          }
        }
      } catch (error) {
        console.error('Description validation error:', error);
        // Silent error handling - don't show loading state errors
      }
    };

    const timer = setTimeout(validateDescription, 500);
    return () => clearTimeout(timer);
  }, [formData.description, user?.id]);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const keys = field.split('.');
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      }
      return { ...prev, [field]: value };
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };




  // Media upload functions with Cloudinary and limits enforcement
  const handleFileSelect = async (files) => {
    // Count current media
    const currentPhotos = formData.attachments.filter(att => att.isImage).length;
    const currentVideos = formData.attachments.filter(att => att.isVideo).length;

    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      // Check file type
      if (!isImage && !isVideo) {
        toast.error(`${file.name}: Only image and video files are allowed`);
        return false;
      }

      // Check media limits
      if (isImage && currentPhotos >= 5) {
        toast.error('Maximum 5 photos allowed');
        return false;
      }

      if (isVideo && currentVideos >= 1) {
        toast.error('Maximum 1 video allowed');
        return false;
      }

      // Check file size limits
      const maxImageSize = 5 * 1024 * 1024; // 5MB for images
      const maxVideoSize = 50 * 1024 * 1024; // 50MB for videos

      if (isImage && file.size > maxImageSize) {
        toast.error(`${file.name}: Image size must be less than 5MB`);
        return false;
      }

      if (isVideo && file.size > maxVideoSize) {
        toast.error(`${file.name}: Video size must be less than 50MB`);
        return false;
      }

      // Check specific file types
      if (isImage && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: Only JPEG, PNG, and WebP images are allowed`);
        return false;
      }

      if (isVideo && !['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'].includes(file.type)) {
        toast.error(`${file.name}: Only MP4, MOV, and AVI videos are allowed`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    const newAttachments = [];

    for (const file of validFiles) {
      try {
        const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Create FormData for upload
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('existingPhotos', currentPhotos.toString());
        uploadFormData.append('existingVideos', currentVideos.toString());

        // Upload progress simulation
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const currentProgress = prev[fileId] || 0;
            const newProgress = Math.min(currentProgress + 15, 85);
            return { ...prev, [fileId]: newProgress };
          });
        }, 200);

        // Upload to Cloudinary via API
        const uploadResponse = await fetch('/api/jobs/upload-media', {
          method: 'POST',
          body: uploadFormData,
        });

        clearInterval(progressInterval);

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Upload failed');
        }

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          throw new Error(uploadResult.message || 'Upload failed');
        }

        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        newAttachments.push({
          id: uploadResult.media.id,
          name: uploadResult.media.filename,
          filename: uploadResult.media.filename, // Required by JobDraft model
          type: uploadResult.media.type,
          size: uploadResult.media.size,
          url: uploadResult.media.url,
          publicId: uploadResult.media.publicId,
          isImage: uploadResult.media.isImage,
          isVideo: uploadResult.media.isVideo,
          width: uploadResult.media.width,
          height: uploadResult.media.height,
          duration: uploadResult.media.duration,
          createdAt: uploadResult.media.createdAt
        });

        console.log(`✅ Uploaded: ${file.name}`);

      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }

    if (newAttachments.length > 0) {
      handleInputChange('attachments', [...formData.attachments, ...newAttachments]);
      toast.success(`Successfully uploaded ${newAttachments.length} file(s)`);
    }

    setUploading(false);
    setUploadProgress({});
  };

  const removeAttachment = async (attachmentId) => {
    const attachment = formData.attachments.find(att => att.id === attachmentId);

    if (!attachment) return;

    try {
      // If it's a Cloudinary upload, delete from server
      if (attachment.publicId) {
        const deleteResponse = await fetch(`/api/jobs/upload-media?publicId=${attachment.publicId}`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          console.error('Delete error:', errorData.message);
          toast.error('Failed to delete file from server');
          return;
        }

        console.log(`🗑️ Deleted from Cloudinary: ${attachment.name}`);
      }

      // If it's a blob URL (preview), revoke it
      if (attachment.url && attachment.url.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url);
      }

      // Remove from form data
      handleInputChange('attachments', formData.attachments.filter(att => att.id !== attachmentId));
      toast.success('File removed successfully');

    } catch (error) {
      console.error('Error removing attachment:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Content validation helper function
  const validateContent = async (text, fieldName) => {
    if (!text || text.trim().length === 0) return null;

    try {
      const contentValidation = await fetch('/api/validate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          context: 'job_posting',
          userId: user?.id
        }),
      });

      if (contentValidation.ok) {
        const result = await contentValidation.json();
        if (!result.isValid && result.violations.length > 0) {
          const violationTypes = result.violations.map(v => v.type);
          let message = `${fieldName} contains inappropriate content: `;

          if (violationTypes.includes('profanity') || violationTypes.includes('abuse')) {
            message += 'abuse words, ';
          }
          if (violationTypes.includes('phone_number')) {
            message += 'phone numbers, ';
          }
          if (violationTypes.includes('email_address')) {
            message += 'email addresses, ';
          }
          if (violationTypes.includes('url') || violationTypes.includes('social_media')) {
            message += 'links/social media, ';
          }
          if (violationTypes.includes('promotional') || violationTypes.includes('spam')) {
            message += 'promotional content, ';
          }
          if (violationTypes.includes('location')) {
            message += 'location details, ';
          }

          message = message.replace(/, $/, '');
          return message;
        }
      }
    } catch (error) {
      console.error('Content validation error:', error);
    }
    return null;
  };

  const validateStep = async (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.title || !formData.title.trim()) {
          newErrors.title = 'Title is required';
        } else if (formData.title.length < 10) {
          newErrors.title = 'Title must be at least 10 characters';
        } else {
          // Content validation for title
          const titleValidation = await validateContent(formData.title, 'Title');
          if (titleValidation) {
            newErrors.title = titleValidation;
          }
        }

        if (!formData.description || !formData.description.trim()) {
          newErrors.description = 'Description is required';
        } else if (formData.description.length < 30) {
          newErrors.description = 'Description must be at least 30 characters';
        } else {
          // Content validation for description
          const descValidation = await validateContent(formData.description, 'Description');
          if (descValidation) {
            newErrors.description = descValidation;
          }
        }

        if (formData.skillsRequired.length === 0) {
          newErrors.skillsRequired = 'At least one skill is required';
        }
        break;

      case 2:
        if (formData.budget.type !== 'negotiable' && !formData.budget.amount) {
          newErrors['budget.amount'] = 'Budget amount is required';
        }

        if (!formData.location.address || !formData.location.address.trim()) {
          newErrors['location.address'] = 'Address is required';
        }

        if (!formData.location.city || !formData.location.city.trim()) {
          newErrors['location.city'] = 'City is required';
        }

        if (formData.location.pincode && !/^[0-9]{6}$/.test(formData.location.pincode)) {
          newErrors['location.pincode'] = 'Invalid pincode format';
        }
        break;

      case 3:
        // Deadline validation based on urgency
        if (formData.urgency === 'scheduled') {
          // For scheduled jobs, scheduledDate is required, not deadline
          if (!formData.scheduledDate) {
            newErrors.scheduledDate = 'Scheduled date is required for scheduled jobs';
          } else if (new Date(formData.scheduledDate) <= new Date()) {
            newErrors.scheduledDate = 'Scheduled date must be in the future';
          }
        } else {
          // For flexible and ASAP jobs, deadline is required
          if (!formData.deadline) {
            newErrors.deadline = 'Deadline is required';
          } else if (new Date(formData.deadline) <= new Date()) {
            newErrors.deadline = 'Deadline must be in the future';
          } else {
            // Check 24-hour restriction for free users
            const twentyFourHoursFromNow = new Date();
            twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

            if (!subscriptionInfo?.isPro && new Date(formData.deadline) < twentyFourHoursFromNow) {
              newErrors.deadline = 'Free users must set deadlines at least 24 hours in advance. Upgrade to Pro for priority scheduling.';
            }
          }
        }

        if (formData.scheduledDate && new Date(formData.scheduledDate) <= new Date()) {
          newErrors.scheduledDate = 'Scheduled date must be in the future';
        }

        // Check mandatory photo requirement
        const photoCount = formData.attachments.filter(att => att.isImage).length;
        if (photoCount === 0) {
          newErrors.attachments = 'At least 1 photo is required';
        }
        break;

      case 4:
        // Final comprehensive validation - check all steps
        // Step 1 validation
        if (!formData.title || !formData.title.trim()) {
          newErrors.title = 'Job title is required';
        } else if (formData.title.length < 10) {
          newErrors.title = 'Job title must be at least 10 characters';
        } else if (formData.title.length > 30) {
          newErrors.title = 'Job title cannot exceed 30 characters';
        }

        if (!formData.description || !formData.description.trim()) {
          newErrors.description = 'Job description is required';
        } else if (formData.description.length < 30) {
          newErrors.description = 'Description must be at least 30 characters';
        }

        if (formData.skillsRequired.length === 0) {
          newErrors.skillsRequired = 'At least one skill must be selected';
        }

        // Step 2 validation
        if (!formData.budget.type) {
          newErrors['budget.type'] = 'Budget type must be selected';
        }

        if (formData.budget.type !== 'negotiable' && (!formData.budget.amount || formData.budget.amount <= 0)) {
          newErrors['budget.amount'] = 'Valid budget amount is required';
        }

        if (!formData.location.address || !formData.location.address.trim()) {
          newErrors['location.address'] = 'Complete address is required';
        }

        if (!formData.location.city || !formData.location.city.trim()) {
          newErrors['location.city'] = 'City is required';
        }

        // Step 3 validation
        // Step 4: Final validation - deadline based on urgency
        if (formData.urgency === 'scheduled') {
          if (!formData.scheduledDate) {
            newErrors.scheduledDate = 'Scheduled date is required for scheduled jobs';
          } else if (new Date(formData.scheduledDate) <= new Date()) {
            newErrors.scheduledDate = 'Scheduled date must be in the future';
          }
        } else {
          if (!formData.deadline) {
            newErrors.deadline = 'Job deadline is required';
          } else if (new Date(formData.deadline) <= new Date()) {
            newErrors.deadline = 'Deadline must be in the future';
          } else {
            const twentyFourHoursFromNow = new Date();
            twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

            if (!subscriptionInfo?.isPro && new Date(formData.deadline) < twentyFourHoursFromNow) {
              newErrors.deadline = 'Free users must set deadlines at least 24 hours in advance. Upgrade to Pro for priority scheduling.';
            }
          }
        }

        if (formData.scheduledDate && new Date(formData.scheduledDate) <= new Date()) {
          newErrors.scheduledDate = 'Scheduled date must be in the future';
        }

        if (!formData.urgency) {
          newErrors.urgency = 'Urgency level must be selected';
        }

        // Media validation
        const photos = formData.attachments.filter(att => att.isImage);
        const videos = formData.attachments.filter(att => att.isVideo);

        if (photos.length === 0) {
          newErrors.attachments = 'At least 1 photo is required to post a job';
        } else if (photos.length > 5) {
          newErrors.attachments = 'Maximum 5 photos allowed';
        }

        if (videos.length > 1) {
          newErrors.attachments = 'Maximum 1 video allowed';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    try {
      const isValid = await validateStep(currentStep);
      if (isValid) {
        // Auto-save when moving to next step
        if (hasUnsavedChanges) {
          await saveDraft('step_change');
        }

        setCurrentStep(prev => Math.min(prev + 1, totalSteps));

        // Scroll to top for better UX
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Show specific validation errors
        const errorMessages = Object.values(errors).filter(msg => msg);
        if (errorMessages.length > 0) {
          const firstError = errorMessages[0];
          toast.error(firstError);
        } else {
          toast.error('Please complete all required fields before proceeding');
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));

    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    try {
      const isValid = await validateStep(currentStep);
      if (!isValid) {
        // Show specific validation errors
        const errorMessages = Object.values(errors).filter(msg => msg);
        if (errorMessages.length > 0) {
          const firstError = errorMessages[0];
          toast.error(firstError);
        } else {
          toast.error('Please complete all required fields before submitting');
        }
        return;
      }

      setLoading(true);

      // Prepare submission data with draftId if available
      const submissionData = {
        ...formData,
        draftId: currentDraftId // Include draft ID for conversion
      };

      const response = await fetch('/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Invalid response from server');
      }

      if (response.ok && data.success) {
        toast.success('Job posted successfully!');

        // Clear the draft state since job is posted
        setCurrentDraftId(null);
        setDraftStatus('unsaved');
        setHasUnsavedChanges(false);

        // Navigate to job details or dashboard
        router.push('/dashboard?tab=jobs');
      } else {
        console.error('Error posting job:', data);
        toast.error(data.message || 'Failed to post job. Please check your input and try again.');

        // Handle specific validation errors
        if (data.violations) {
          console.log('Content violations:', data.violations);
        }
      }
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Job Details
        </h2>
        <p className="text-fixly-text-light mb-6">
          Provide clear details about what you need done
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Job Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="e.g., Fix kitchen sink leak"
          className={`input-field ${
            fieldValidations.title === false ? 'border-red-500 focus:border-red-500' :
            fieldValidations.title === true ? 'border-green-500 focus:border-green-500' :
            errors.title ? 'border-red-500 focus:border-red-500' : ''
          }`}
          maxLength={30}
        />
        <div className="flex justify-between mt-1">
          <div className="flex-1">
            {validationMessages.title && (
              <p className={`text-sm ${fieldValidations.title ? 'text-green-600' : 'text-red-500'}`}>
                {validationMessages.title}
              </p>
            )}
            {errors.title && !validationMessages.title && (
              <p className="text-red-500 text-sm">{errors.title}</p>
            )}
          </div>
          <p className="text-xs text-fixly-text-muted ml-auto">
            {formData.title.length}/30
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe the work in detail. Include what needs to be done, any specific requirements, and what materials are needed..."
          className={`textarea-field h-32 ${
            fieldValidations.description === false ? 'border-red-500 focus:border-red-500' :
            fieldValidations.description === true ? 'border-green-500 focus:border-green-500' :
            errors.description ? 'border-red-500 focus:border-red-500' : ''
          }`}
          maxLength={2000}
        />
        <div className="flex justify-between mt-1">
          <div className="flex-1">
            {validationMessages.description && (
              <p className={`text-sm ${fieldValidations.description ? 'text-green-600' : 'text-red-500'}`}>
                {validationMessages.description}
              </p>
            )}
            {errors.description && !validationMessages.description && (
              <p className="text-red-500 text-sm">{errors.description}</p>
            )}
          </div>
          <p className="text-xs text-fixly-text-muted ml-auto">
            {formData.description.length}/2000
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Skills Required <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-fixly-text-light mb-4">
          Select the skills needed for this job. This helps fixers understand the requirements.
        </p>

        <SkillSelector
          isModal={false}
          selectedSkills={formData.skillsRequired}
          onSkillsChange={(skills) => handleInputChange('skillsRequired', skills)}
          minSkills={1}
          maxSkills={15}
          className="w-full"
        />

        {errors.skillsRequired && (
          <p className="text-red-500 text-sm mt-1">{errors.skillsRequired}</p>
        )}
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Budget & Location
        </h2>
        <p className="text-fixly-text-light mb-6">
          Set your budget and specify the job location
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Budget Type *
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'fixed', label: 'Fixed Price', icon: DollarSign },
            { value: 'hourly', label: 'Per Hour', icon: Clock },
            { value: 'negotiable', label: 'Negotiable', icon: AlertCircle }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleInputChange('budget.type', value)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                formData.budget.type === value
                  ? 'border-fixly-accent bg-fixly-accent/10'
                  : 'border-fixly-border hover:border-fixly-accent'
              }`}
            >
              <Icon className="h-6 w-6 text-fixly-accent mx-auto mb-2" />
              <div className="font-medium text-fixly-text">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {formData.budget.type !== 'negotiable' && (
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Budget Amount (₹) *
          </label>
          <input
            type="number"
            value={formData.budget.amount}
            onChange={(e) => handleInputChange('budget.amount', e.target.value)}
            placeholder="Enter amount"
            className={`input-field ${errors['budget.amount'] ? 'border-red-500 focus:border-red-500' : ''}`}
            min="1"
          />
          {errors['budget.amount'] && (
            <p className="text-red-500 text-sm mt-1">{errors['budget.amount']}</p>
          )}
        </div>
      )}

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.budget.materialsIncluded}
            onChange={(e) => handleInputChange('budget.materialsIncluded', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-fixly-text">
            Materials and supplies included in budget
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Job Location <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-fixly-text-light mb-4">
          Provide the complete address where the work needs to be done. We'll use GPS to help auto-fill details.
        </p>

        <EnhancedLocationSelector
          initialLocation={formData.location}
          onLocationSelect={(location) => {
            // Transform the location data to match the expected format
            const transformedLocation = {
              address: location?.address || location?.formatted || '',
              city: location?.components?.city || location?.city || '',
              state: location?.components?.state || location?.state || '',
              pincode: location?.components?.pincode || location?.pincode || '',
              lat: location?.lat || location?.coordinates?.lat || null,
              lng: location?.lng || location?.coordinates?.lng || null,
              // Keep original data for reference
              _original: location
            };
            handleInputChange('location', transformedLocation);
          }}
          required={true}
          className="w-full"
        />

        {errors['location.address'] && (
          <p className="text-red-500 text-sm mt-1">{errors['location.address']}</p>
        )}
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Timing & Requirements
        </h2>
        <p className="text-fixly-text-light mb-6">
          When do you need this work completed?
        </p>
      </div>

      {/* Enhanced Deadline Selection */}
      {formData.urgency !== 'scheduled' ? (
        <DeadlineSelector
          selectedDeadline={formData.deadline}
          onDeadlineSelect={(deadline) => handleInputChange('deadline', deadline ? deadline.toISOString().slice(0, 16) : '')}
          userPlan={subscriptionInfo?.isPro ? 'pro' : 'free'}
          required={true}
          error={errors.deadline}
          className="mb-6"
        />
      ) : (
        <div>
          <label className="block text-sm font-medium text-fixly-text mb-2">
            Scheduled Date *
          </label>
          <p className="text-xs text-fixly-text-light mb-4">
            Set the specific date and time when this job should be started.
          </p>
          <DeadlineSelector
            selectedDeadline={formData.scheduledDate}
            onDeadlineSelect={(scheduledDate) => handleInputChange('scheduledDate', scheduledDate ? scheduledDate.toISOString().slice(0, 16) : '')}
            userPlan={subscriptionInfo?.isPro ? 'pro' : 'free'}
            required={true}
            error={errors.scheduledDate}
            mode="scheduled"
            className="mb-4"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Urgency
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'asap', label: 'ASAP', desc: 'Within 24 hours', requiresPro: true },
            { value: 'flexible', label: 'Flexible', desc: 'Within a few days' },
            { value: 'scheduled', label: 'Scheduled', desc: 'On specific date' }
          ].map(({ value, label, desc, requiresPro }) => {
            const isPro = subscriptionInfo?.isPro;
            const canSelect = !requiresPro || isPro;
            
            return (
              <button
                key={value}
                onClick={() => {
                  if (requiresPro && !isPro) {
                    setShowProModal(true);
                  } else {
                    handleInputChange('urgency', value);
                  }
                }}
                className={`p-4 rounded-lg border-2 transition-colors text-left relative ${
                  formData.urgency === value
                    ? 'border-fixly-accent bg-fixly-accent/10'
                    : canSelect 
                      ? 'border-fixly-border hover:border-fixly-accent'
                      : 'border-fixly-border opacity-60'
                }`}
              >
                <div className="font-medium text-fixly-text">{label}</div>
                {requiresPro && (
                  <div className="text-xs text-fixly-accent font-medium mt-1">
                    {isPro ? '✓ Pro' : '🔒 Pro Required'}
                  </div>
                )}
                <div className="text-sm text-fixly-text-muted">{desc}</div>
              </button>
            );
          })}
        </div>
      </div>


      {/* Media Upload Section */}
      <div>
        <label className="block text-sm font-medium text-fixly-text mb-2">
          Photos & Videos <span className="text-red-500">*</span>
        </label>
        <p className="text-fixly-text-muted text-sm mb-4">
          Upload at least 1 photo (max 5 photos and 1 video). Photos help fixers understand your requirements better.
        </p>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-fixly-accent bg-fixly-accent/5'
              : 'border-fixly-border hover:border-fixly-accent'
          }`}
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-fixly-accent/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-fixly-accent" />
            </div>
            <h3 className="font-medium text-fixly-text mb-2">
              {dragOver ? 'Drop files here' : 'Upload photos and videos'}
            </h3>
            <p className="text-fixly-text-muted text-sm mb-4">
              Drag and drop files here, or click to browse
            </p>
            <div className="flex items-center gap-4 text-xs text-fixly-text-muted">
              <span>• Images: max 5MB (5 max)</span>
              <span>• Videos: max 50MB (1 max)</span>
              <span>• Formats: JPG, PNG, WebP, MP4, MOV, AVI</span>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="btn-primary mt-4 cursor-pointer"
            >
              <Camera className="h-4 w-4 mr-2" />
              Choose Files
            </label>
          </div>
        </div>

        {/* Error Display */}
        {errors.attachments && (
          <div className="mt-2">
            <p className="text-red-500 text-sm">{errors.attachments}</p>
          </div>
        )}

        {/* Media Count Display */}
        <div className="mt-4 flex items-center gap-4 text-sm text-fixly-text-muted">
          <span>Photos: {formData.attachments.filter(att => att.isImage).length}/5</span>
          <span>Videos: {formData.attachments.filter(att => att.isVideo).length}/1</span>
        </div>

        {/* Uploaded Files Preview */}
        {formData.attachments.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-fixly-text mb-4">
              Uploaded Files ({formData.attachments.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.attachments.map((attachment) => (
                <div key={attachment.id} className="relative group">
                  <div className="relative bg-fixly-card border border-fixly-border rounded-lg overflow-hidden">
                    {attachment.isImage ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-fixly-surface flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-fixly-accent mx-auto mb-1" />
                          <p className="text-xs text-fixly-text-muted">Video</p>
                        </div>
                      </div>
                    )}
                    
                    {/* File info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                      <p className="text-xs truncate">{attachment.name}</p>
                      <p className="text-xs text-gray-300">
                        {(attachment.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && Object.keys(uploadProgress).length > 0 && (
          <div className="mt-4 space-y-2">
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="flex items-center gap-3">
                <Loader className="h-4 w-4 animate-spin text-fixly-accent" />
                <div className="flex-1 bg-fixly-surface rounded-full h-2">
                  <div 
                    className="bg-fixly-accent h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-fixly-text-muted">{progress}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-fixly-text mb-4">
          Review & Submit
        </h2>
        <p className="text-fixly-text-light mb-6">
          Review your job details before posting
        </p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-fixly-text mb-4">Job Summary</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-fixly-text">{formData.title}</h4>
            <p className="text-fixly-text-muted text-sm mt-1">
              {formData.description.substring(0, 200)}...
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.skillsRequired.map((skill, index) => (
                  <span key={index} className="skill-chip text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="font-medium">Budget:</span>
              <p className="text-fixly-text-muted">
                {formData.budget.type === 'negotiable'
                  ? 'Negotiable'
                  : `₹${formData.budget.amount} (${formData.budget.type})`
                }
              </p>
            </div>

            <div>
              <span className="font-medium">Location:</span>
              <p className="text-fixly-text-muted">
                {formData.location.city}, {formData.location.state}
              </p>
            </div>

            <div>
              <span className="font-medium">
                {formData.urgency === 'scheduled' ? 'Scheduled Date:' : 'Deadline:'}
              </span>
              <p className="text-fixly-text-muted">
                {formData.urgency === 'scheduled' && formData.scheduledDate
                  ? new Date(formData.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : formData.deadline
                    ? new Date(formData.deadline).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Not set'
                }
              </p>
            </div>

            <div>
              <span className="font-medium">Urgency:</span>
              <p className="text-fixly-text-muted capitalize">
                {formData.urgency === 'asap' ? 'ASAP' : formData.urgency}
              </p>
            </div>
          </div>

          {/* Media attachments preview */}
          {formData.attachments.length > 0 && (
            <div className="mt-6">
              <span className="font-medium block mb-3">Attachments ({formData.attachments.length})</span>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {formData.attachments.map((attachment) => (
                  <div key={attachment.id} className="relative bg-fixly-surface rounded-lg overflow-hidden">
                    {attachment.isImage ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-16 object-cover"
                      />
                    ) : (
                      <div className="w-full h-16 bg-fixly-surface flex items-center justify-center">
                        <FileText className="h-6 w-6 text-fixly-accent" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1">
                      <p className="text-xs truncate">{attachment.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">
              Rate Limit Notice
            </p>
            <p className="text-yellow-700 mt-1">
              Free users can post another job in 3 hours. Upgrade to Pro for unlimited posting!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header with Draft Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fixly-text">Post New Job</h1>
          <div className="flex items-center gap-4 mt-2">
            {/* Draft Status */}
            <div className="flex items-center gap-2 text-sm">
              {draftStatus === 'saving' && (
                <>
                  <Loader className="h-4 w-4 animate-spin text-fixly-accent" />
                  <span className="text-fixly-text-muted">Saving...</span>
                </>
              )}
              {draftStatus === 'saved' && lastSaved && (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-fixly-text-muted">
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                </>
              )}
              {draftStatus === 'unsaved' && hasUnsavedChanges && (
                <>
                  <Timer className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Unsaved changes</span>
                </>
              )}
              {draftStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Save failed</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Draft Actions */}
        <div className="flex items-center gap-3">
          {/* Save Draft Button */}
          <button
            onClick={() => saveDraft('manual')}
            disabled={draftStatus === 'saving' || !hasUnsavedChanges}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>

          {/* Load Draft Button */}
          <button
            onClick={() => setShowDraftModal(true)}
            className="btn-outline flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Load Draft
            {availableDrafts.length > 0 && (
              <span className="bg-fixly-accent text-fixly-text text-xs px-2 py-1 rounded-full">
                {availableDrafts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                currentStep >= step
                  ? 'bg-fixly-accent text-fixly-text'
                  : 'bg-fixly-border text-fixly-text-muted'
              }`}
            >
              {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
            </div>
          ))}
        </div>
        <div className="h-2 bg-fixly-border rounded-full">
          <div 
            className="h-full bg-fixly-accent rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form content */}
      <div className="card min-h-[500px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* Comprehensive Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following issues:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(errors).map(([field, message]) => {
                    // Better field name formatting
                    const fieldNames = {
                      'title': 'Job Title',
                      'description': 'Job Description',
                      'skillsRequired': 'Required Skills',
                      'budget.type': 'Budget Type',
                      'budget.amount': 'Budget Amount',
                      'location.address': 'Job Address',
                      'location.city': 'City',
                      'location.pincode': 'Pincode',
                      'deadline': 'Job Deadline',
                      'scheduledDate': 'Scheduled Date',
                      'urgency': 'Urgency Level',
                      'attachments': 'Photos/Videos'
                    };

                    const displayName = fieldNames[field] || field.replace(/\./g, ' ').replace(/([A-Z])/g, ' $1');

                    return (
                      <li key={field}>
                        <strong>{displayName}:</strong> {message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        {currentStep > 1 && (
          <button
            onClick={handlePrevious}
            className="btn-ghost flex items-center"
          >
            Previous
          </button>
        )}
        
        <div className="ml-auto">
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="btn-primary flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              Post Job
            </button>
          )}
        </div>
      </div>

      {/* Pro Subscription Modal */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-fixly-card rounded-xl p-6 w-full max-w-md"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-fixly-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-fixly-accent" />
              </div>
              <h3 className="text-xl font-bold text-fixly-text mb-2">
                Unlock Pro Features
              </h3>
              <p className="text-fixly-text-muted">
                Get ASAP posting, unlimited jobs, and job boosting for just ₹49/month!
              </p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Unlimited job posting (no 3-hour wait)
              </div>
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ASAP feature for urgent jobs
              </div>
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Job boosting for better visibility
              </div>
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Priority support
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowProModal(false)}
                className="btn-ghost flex-1"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  setShowProModal(false);
                  router.push('/dashboard/subscription');
                }}
                className="btn-primary flex-1"
              >
                Upgrade Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Subscription Info Banner */}
      {subscriptionInfo && !subscriptionInfo.isPro && !subscriptionInfo.canPostJob && (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center text-yellow-800">
            <Clock className="h-5 w-5 mr-3" />
            <div className="flex-1">
              <p className="font-medium">Job posting limit reached</p>
              <p className="text-sm">
                {subscriptionInfo.nextJobPostTime 
                  ? `Next job can be posted at ${new Date(subscriptionInfo.nextJobPostTime).toLocaleTimeString()}`
                  : 'Upgrade to Pro for unlimited posting'
                }
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="btn-primary ml-4"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* Draft Selection Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-fixly-card rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-fixly-text">Load Draft</h2>
              <button
                onClick={() => setShowDraftModal(false)}
                className="p-2 hover:bg-fixly-surface rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-fixly-text-muted" />
              </button>
            </div>

            {loadingDrafts ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-fixly-accent" />
                <span className="ml-3 text-fixly-text-muted">Loading drafts...</span>
              </div>
            ) : availableDrafts.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 text-fixly-text-muted mx-auto mb-4" />
                <p className="text-fixly-text-muted">No drafts found</p>
                <p className="text-sm text-fixly-text-muted mt-1">
                  Start filling out the form to auto-save your progress
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableDrafts.map((draft) => (
                  <div
                    key={draft._id}
                    className="border border-fixly-border rounded-lg p-4 hover:border-fixly-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-fixly-text mb-1">
                          {draft.title || 'Untitled Job'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-fixly-text-muted mb-2">
                          <span>Step {draft.currentStep}/4</span>
                          <span>{draft.completionPercentage}% complete</span>
                          <span>{draft.ageInHours}h ago</span>
                          {draft.photoCount > 0 && (
                            <span className="flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {draft.photoCount}
                            </span>
                          )}
                          {draft.videoCount > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {draft.videoCount}
                            </span>
                          )}
                        </div>
                        {draft.description && (
                          <p className="text-sm text-fixly-text-muted line-clamp-2">
                            {draft.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-2 bg-fixly-border rounded-full flex-1">
                            <div
                              className="h-full bg-fixly-accent rounded-full transition-all"
                              style={{ width: `${draft.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => loadDraft(draft._id)}
                          className="btn-primary text-sm"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteClick(draft)}
                          className="p-2 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-fixly-border">
              <p className="text-sm text-fixly-text-muted">
                Drafts are automatically deleted after 14 days
              </p>
              <button
                onClick={() => setShowDraftModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Delete Draft</h3>
                    <p className="text-white/80 text-sm">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-fixly-text mb-4">
                  Are you sure you want to delete the draft{' '}
                  <span className="font-semibold text-fixly-accent">
                    "{draftToDelete?.title || 'Untitled Job'}"
                  </span>
                  ? This will permanently remove all progress and cannot be recovered.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      All attachments and form data will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDraftToDelete(null);
                    }}
                    className="btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteDraft}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete Draft
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}