export type UserRole = 'hirer' | 'fixer' | 'admin';
export type AuthMethod = 'email' | 'google' | 'phone';
export type PlanType = 'free' | 'pro';
export type PlanStatus = 'active' | 'expired' | 'cancelled' | 'none';
export type BadgeType =
  | 'top_rated'
  | 'fast_response'
  | 'verified'
  | 'new_fixer'
  | 'experienced'
  | 'reliable';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';
