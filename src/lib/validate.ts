// src/lib/validate.ts
//
// Validation shared by the registration forms. Each rule returns an error
// message, or null when the value is acceptable.

/** Ghana mobile numbers: 0XXXXXXXXX (10 digits) or +233XXXXXXXXX. */
export function phone(value: string): string | null {
  const v = value.replace(/[\s-]/g, '')
  if (!v) return 'Phone number is required.'
  const local = /^0\d{9}$/
  const intl = /^\+233\d{9}$/
  if (!local.test(v) && !intl.test(v)) {
    return 'Enter a valid Ghana number, e.g. 0241234567.'
  }
  return null
}

export function fullName(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Full name is required.'
  if (v.length < 3) return 'Enter the full name.'
  if (!/^[A-Za-z][A-Za-z'\-.\s]*$/.test(v)) return 'Use letters only.'
  if (!/\s/.test(v)) return 'Enter both first and last name.'
  return null
}

export function required(label: string) {
  return (value: string): string | null => (value.trim() ? null : `${label} is required.`)
}

export function pin(value: string): string | null {
  const v = value.trim()
  if (!v) return 'PIN is required.'
  if (!/^\d{4}$/.test(v)) return 'PIN must be exactly 4 digits.'
  if (/^(\d)\1{3}$/.test(v)) return 'Choose a less obvious PIN, not four identical digits.'
  if (v === '1234' || v === '0000') return 'Choose a less obvious PIN.'
  return null
}

export function email(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Email address is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.'
  return null
}

export function password(value: string): string | null {
  if (!value) return 'Password is required.'
  if (value.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Include at least one letter and one number.'
  return null
}

export function orgName(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Organisation name is required.'
  if (v.length < 2) return 'Enter the full organisation name.'
  return null
}

/** Runs a set of rules; returns a map of field -> message for whatever failed. */
export function check(rules: Record<string, string | null>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [field, message] of Object.entries(rules)) {
    if (message) errors[field] = message
  }
  return errors
}

/** Ghana Card number: GHA-XXXXXXXXX-X format */
export function ghanaCard(value: string): string | null {
  const v = value.trim().toUpperCase()
  if (!v) return 'Ghana Card number is required.'
  if (!/^GHA-\d{9}-\d$/.test(v)) return 'Enter a valid Ghana Card number, e.g. GHA-123456789-0.'
  return null
}

/** Ghana Business Registration: format varies, require 5+ alphanumeric */
export function businessReg(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Business registration number is required.'
  if (v.length < 5 || !/^[A-Z0-9\-/]+$/i.test(v)) return 'Enter a valid registration number (letters and numbers only).'
  return null
}
