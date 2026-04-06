import type {
  ApiSuccessMessageResponse,
  ChangePasswordWithOtpRequest,
  CheckEmailAvailabilityResponse,
  ProfilePhotoUploadResponse,
  SendEmailChangeOtpRequest,
  SendPasswordResetOtpRequest,
  UpdatePhoneNumberRequest,
  UpdateProfileRequest,
  UpdateProfileResponse,
  VerifyEmailChangeRequest,
} from '../../types/profile-api';

import {
  asBoolean,
  asNumber,
  asString,
  isRecord,
  parsePartialUser,
  parseProfilePhotoRecord,
  parseSuccessMessageResponse,
  readJson,
} from './profileClient.helpers';

export const sendPasswordResetOtp = async (
  request: SendPasswordResetOtpRequest
): Promise<ApiSuccessMessageResponse> => {
  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return parseSuccessMessageResponse(await readJson(response));
};

export const changePasswordWithOtp = async (
  request: ChangePasswordWithOtpRequest
): Promise<ApiSuccessMessageResponse> => {
  const response = await fetch('/api/user/change-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return parseSuccessMessageResponse(await readJson(response));
};

export const uploadProfilePhoto = async (file: File): Promise<ProfilePhotoUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/user/profile-photo', { method: 'POST', body: formData });
  const payload = await readJson(response);

  if (!isRecord(payload)) {
    return { ok: false, status: response.status, message: 'Invalid upload response' };
  }

  if (response.ok) {
    const profilePhoto = parseProfilePhotoRecord(payload.profilePhoto);
    if (!profilePhoto) {
      return { ok: false, status: response.status, message: 'Invalid profile photo response' };
    }
    return { ok: true, profilePhoto, message: asString(payload.message) };
  }

  return {
    ok: false,
    status: response.status,
    message: asString(payload.message),
    daysRemaining: asNumber(payload.daysRemaining),
  };
};

export const updateProfile = async (
  request: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response);

  if (!isRecord(payload)) {
    return { ok: false, message: 'Invalid profile update response' };
  }

  return {
    ok: response.ok,
    user: parsePartialUser(payload.user),
    message: asString(payload.message),
    rateLimited: asBoolean(payload.rateLimited),
  };
};

export const updatePhoneNumber = async (
  request: UpdatePhoneNumberRequest
): Promise<ApiSuccessMessageResponse> => {
  const response = await fetch('/api/user/update-phone', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return parseSuccessMessageResponse(await readJson(response));
};

export const checkEmailAvailability = async (
  email: string
): Promise<CheckEmailAvailabilityResponse> => {
  try {
    const response = await fetch('/api/user/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const payload = await readJson(response);
    if (!isRecord(payload)) {
      return { available: false, message: 'Invalid email validation response' };
    }
    return { available: payload.available === true, message: asString(payload.message) };
  } catch {
    return { available: false, message: 'Failed to validate email' };
  }
};

export const sendEmailChangeOtp = async (
  request: SendEmailChangeOtpRequest
): Promise<ApiSuccessMessageResponse> => {
  const response = await fetch('/api/user/change-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return parseSuccessMessageResponse(await readJson(response));
};

export const verifyEmailChange = async (
  request: VerifyEmailChangeRequest
): Promise<ApiSuccessMessageResponse> => {
  const response = await fetch('/api/user/change-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return parseSuccessMessageResponse(await readJson(response));
};
