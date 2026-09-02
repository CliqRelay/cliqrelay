export type InvitationRecipientInput = {
  invitationEmail: string | undefined;
  userEmail: string | undefined;
};

export function isInvitationRecipient({
  invitationEmail,
  userEmail,
}: InvitationRecipientInput): boolean {
  if (!invitationEmail || !userEmail) {
    return false;
  }

  return invitationEmail.toLowerCase() === userEmail.toLowerCase();
}
