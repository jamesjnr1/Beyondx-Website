// Remembers which service category a visitor clicked on the public site so
// the Request an Xpert flow can open with it preselected — including after
// they sign in or register as an employer first.
const KEY = 'bx_request_category'

export function setRequestCategory(category: string) {
  try { sessionStorage.setItem(KEY, category) } catch { /* storage unavailable */ }
}

export function takeRequestCategory(): string | null {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v) sessionStorage.removeItem(KEY)
    return v
  } catch { return null }
}
