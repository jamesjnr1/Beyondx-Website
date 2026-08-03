// src/components/auth/employerVerification.ts
//
// Creates the actual Railway employer account, then fires a notification to
// the BeyondX team with the account type and verification details so they
// can review and mark the account as verified.

import { auth, session, contact } from '../../lib/api'

export type PendingEmployer = {
  org: string; contact: string; phone: string; region: string
  email: string; password: string
}

export async function finishEmployerRegistration(
  p: PendingEmployer,
  accountType: 'individual' | 'enterprise' = 'individual',
  ghanaCard = '',
  businessReg = '',
) {
  const data = await auth.employerRegister({
    email: p.email.trim(), password: p.password, orgName: p.org.trim(),
    contactPerson: p.contact.trim(), phone: p.phone.trim(), region: p.region,
  })
  session.saveEmployer(data.token, data.employer)

  // Notification includes type + identity details so the BeyondX team can
  // verify manually and flag the account as cleared before first dispatch.
  contact.send({
    name: p.org.trim(),
    email: p.email.trim(),
    phone: p.phone.trim(),
    message:
      `New employer registered — pending verification.\n\n` +
      `Account type: ${accountType === 'individual' ? 'Individual / Sole Trader' : 'Business / Enterprise'}\n` +
      `Organisation: ${p.org.trim()}\n` +
      `Contact person: ${p.contact.trim()}\n` +
      `Phone: ${p.phone.trim()}\n` +
      `Email: ${p.email.trim()}\n` +
      `Region: ${p.region}\n` +
      (accountType === 'individual' && ghanaCard ? `Ghana Card: ${ghanaCard.trim()}\n` : '') +
      (accountType === 'enterprise' && businessReg ? `Business Reg No: ${businessReg.trim()}\n` : '') +
      `\nAction needed: verify the details above and mark this account as verified in the admin console.`,
    category: 'employer_registered',
  }).catch(() => null)
}
