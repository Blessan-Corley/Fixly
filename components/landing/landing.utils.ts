function isTemporaryUsername(username: string | undefined): boolean {
  return Boolean(username && (username.startsWith('tmp_') || username.startsWith('temp_')));
}

type SessionUser = {
  role?: string;
  username?: string | null;
  authMethod?: string;
  isRegistered?: boolean;
  needsOnboarding?: boolean;
};

export function hasIncompleteSignupSession(
  session: { user?: SessionUser } | null
): boolean {
  if (!session?.user) {
    return false;
  }

  const username =
    typeof session.user.username === 'string' ? session.user.username : undefined;
  const hasRole = typeof session.user.role === 'string' && session.user.role.length > 0;
  const hasValidUsername = Boolean(username && !isTemporaryUsername(username));

  return (
    session.user.isRegistered !== true ||
    session.user.needsOnboarding === true ||
    !hasRole ||
    !hasValidUsername
  );
}
