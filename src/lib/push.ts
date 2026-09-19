// src/lib/push.ts
//
// Web Push subscription helper. The VAPID public key below is meant to be
// public — that's the whole point of the VAPID key pair — so hardcoding it
// here is correct, not a secret leak. It must match VAPID_PRIVATE_KEY set
// on the Railway backend, or every subscribe() call will silently produce
// a subscription the backend can never actually push to.
//
// IMPORTANT (iOS): Safari only supports web push for a site that has
// already been added to the Home Screen — it does not work in a normal
// Safari tab, no matter what permission is granted. See isPushCapable().
export const VAPID_PUBLIC_KEY = 'BBj3urorOUu2CW7OD6CpWNg2In_jRQtgd6FHOOLPvaJI6rfU-UUFiYcvJ8uixqJ7UUS3hUpFOreI2_4XXuXxntA'

import { push as pushApi } from './api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export type PushCapability = 'unsupported' | 'ios-needs-install' | 'ready'

// Whether push can work at all on this device right now. iOS Safari only
// grants the Push API to a site running as an installed home-screen app —
// in a regular tab, Notification.requestPermission() and
// pushManager.subscribe() are both unavailable there, so there is nothing
// to fall back to except telling the person to install first.
export function getPushCapability(): PushCapability {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    if (isIOS() && !isStandalone()) return 'ios-needs-install'
    return 'unsupported'
  }
  return 'ready'
}

export type PushStatus = 'unsupported' | 'ios-needs-install' | 'denied' | 'not-subscribed' | 'subscribed'

export async function getPushStatus(): Promise<PushStatus> {
  const capability = getPushCapability()
  if (capability !== 'ready') return capability
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  return existing ? 'subscribed' : 'not-subscribed'
}

// Requests permission (if not already decided) and creates + saves a push
// subscription for whichever account is signed in. Must be called from a
// user gesture (a click handler) — browsers reject requestPermission()
// calls that don't originate from one.
export async function enablePush(token: string): Promise<PushStatus> {
  if (getPushCapability() !== 'ready') return getPushCapability() as PushStatus

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const reg = await navigator.serviceWorker.ready
  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Browser did not return a usable push subscription.')
  }

  await pushApi.subscribe(
    { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
    token,
  )
  return 'subscribed'
}

export async function disablePush(token: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await pushApi.unsubscribe(endpoint, token).catch(() => {})
}
