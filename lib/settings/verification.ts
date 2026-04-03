type VerificationStatusInput = 'pending' | 'rejected' | 'approved' | 'unverified' | undefined;

export type VerificationStatusPresentation = {
  dotClassName: string;
  description: string;
  badgeClassName: string;
  badgeLabel: string;
};

export function getVerificationStatusPresentation(
  isVerified: boolean,
  status: VerificationStatusInput
): VerificationStatusPresentation {
  if (isVerified) {
    return {
      dotClassName: 'bg-green-500',
      description: 'Your account is verified',
      badgeClassName: 'bg-green-100 text-green-800',
      badgeLabel: 'Verified',
    };
  }

  if (status === 'pending') {
    return {
      dotClassName: 'bg-yellow-500',
      description: 'Verification pending review',
      badgeClassName: 'bg-yellow-100 text-yellow-800',
      badgeLabel: 'Pending',
    };
  }

  if (status === 'rejected') {
    return {
      dotClassName: 'bg-red-500',
      description: 'Verification rejected',
      badgeClassName: 'bg-red-100 text-red-800',
      badgeLabel: 'Rejected',
    };
  }

  return {
    dotClassName: 'bg-gray-400',
    description: 'Not verified',
    badgeClassName: 'bg-gray-100 text-gray-800',
    badgeLabel: 'Unverified',
  };
}
