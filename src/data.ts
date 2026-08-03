import {
  Brush,           // Facility & Cleaning
  Truck,           // Logistics & Delivery
  HardHat,         // Construction, Maintenance & Repairs
  UtensilsCrossed, // Event & Hospitality
  Sprout,          // Agriculture & Environment
  Package,         // Retail & Trade Support
  Building2,       // Community Services
  Keyboard,        // Data Entry
  Headphones,      // Customer Support
  BarChart3,       // Social Media & Content
  Languages,       // Transcription & Translation
  Telescope,       // Online Research
  CalendarCheck,   // Virtual Assistance
  type LucideIcon,
} from 'lucide-react'

export type WorkMode = 'field' | 'remote'

export interface Category {
  icon: LucideIcon
  title: string
  description: string
  image: string
  tasks: string[]
  /** Standard BeyondX rate in GH₵. Used for remote and single-tier categories. */
  rate: number
  /** What the rate covers, when it is not simply a day's work. */
  rateUnit?: string
  /** On-site work, or work done from anywhere. Defaults to 'field'. */
  mode?: WorkMode
  /** Skilled tier rate, where complexity warrants a different rate. */
  skilledRate?: number
  /** Short label describing what the skilled tier covers. */
  skilledLabel?: string
  /** If true, a tool-provision surcharge (+15%) applies when the worker provides tools.
   *  Applies to Agriculture, Construction, Facility & Cleaning. */
  toolModifier?: boolean
  /** Logistics & Delivery only — uses distance-based pricing instead of a flat day rate. */
  distancePricing?: boolean
  /** Minimum booking in days (Agriculture = 2). */
  minDays?: number
}

export const categories: Category[] = [
  {
    icon: Brush,
    title: 'Facility & Cleaning',
    description: 'Office, school, and hospital cleaning plus drain clearing.',
    image: '/categories/general-labour.jpg',
    tasks: ['Office cleaning', 'School compound sweeping', 'Hospital ward cleaning', 'Gutter & drain clearing'],
    rate: 100,
    skilledRate: 140,
    skilledLabel: 'drain clearing',
    toolModifier: true,
  },
  {
    icon: Truck,
    title: 'Logistics & Delivery',
    description: 'Warehouse, port, and market goods handling.',
    image: '/categories/logistics.jpg',
    tasks: ['Warehouse stock sorting', 'Goods offloading — Tema Port', 'Supermarket shelf stocking', 'Market porter'],
    rate: 40,           // base fee 0-3km (delivery runs). Warehouse/port stays on tier above.
    rateUnit: 'base (0–3km)',
    distancePricing: true,
  },
  {
    icon: HardHat,
    title: 'Construction, Maintenance & Repairs',
    description: 'Construction, painting, tiling, plumbing support, and site labour.',
    image: '/categories/painting.jpg',
    tasks: ['Painting & touch-up work', 'Tiling assistance', 'Plumbing support', 'Building site labourer'],
    rate: 130,
    skilledRate: 220,
    skilledLabel: 'tiling, plumbing',
    toolModifier: true,
  },
  {
    icon: UtensilsCrossed,
    title: 'Event & Hospitality',
    description: 'Setup, catering support, and venue preparation.',
    image: '/categories/hospitality.jpg',
    tasks: ['Chair & table setup', 'Catering assistant', 'Food serving at events', 'Venue decoration setup'],
    rate: 100,
    skilledRate: 200,
    skilledLabel: 'electricals, AV',
  },
  {
    icon: Sprout,
    title: 'Agriculture & Environment',
    description: 'Farming, landscaping, and green space upkeep.',
    image: '/categories/landscaping.jpg',
    tasks: ['Farm weeding & harvesting', 'Grass cutting & landscaping', 'Tree planting', 'Community garden maintenance'],
    rate: 90,
    rateUnit: 'per day',
    toolModifier: true,
    minDays: 2,
  },
  {
    icon: Package,
    title: 'Retail & Trade Support',
    description: 'Shop, packing, and cold store assistance.',
    image: '/categories/electrical.jpg',
    tasks: ['Shop attendant', 'Packing and bagging', 'Loading & offloading trucks', 'Cold store assistant'],
    rate: 80,
    skilledRate: 110,
    skilledLabel: 'cold store, stock handling',
  },
  {
    icon: Building2,
    title: 'Community Services',
    description: 'Waste collection and public space maintenance.',
    image: '/categories/construction.jpg',
    tasks: ['Neighbourhood waste collection', 'School painting', 'Street drain maintenance', 'Public park upkeep'],
    rate: 140,
    // Low variance — stays flat, no skilled tier
  },
]

export const remoteCategories: Category[] = [
  {
    icon: Keyboard,
    title: 'Data Entry & Digitisation',
    description: 'Typing records, digitising paper files, and cleaning up spreadsheets.',
    image: '/categories/general-labour.jpg',
    tasks: ['Typing records into spreadsheets', 'Digitising paper files', 'Product catalogue entry', 'Cleaning up customer lists'],
    rate: 90,
    mode: 'remote',
  },
  {
    icon: Headphones,
    title: 'Customer Support',
    description: 'Answering calls, WhatsApp, and messages for small businesses.',
    image: '/categories/hospitality.jpg',
    tasks: ['Answering customer calls', 'Replying on WhatsApp Business', 'Order confirmation calls', 'Handling delivery enquiries'],
    rate: 110,
    mode: 'remote',
  },
  {
    icon: BarChart3,
    title: 'Social Media & Content',
    description: 'Posting, replying to comments, and simple content for local brands.',
    image: '/categories/logistics.jpg',
    tasks: ['Scheduling daily posts', 'Replying to comments and DMs', 'Writing product captions', 'Basic photo editing'],
    rate: 120,
    mode: 'remote',
  },
  {
    icon: Languages,
    title: 'Transcription & Translation',
    description: 'Audio typed up, and translation between English and local languages.',
    image: '/categories/painting.jpg',
    tasks: ['Transcribing interviews', 'Twi / Ga / Ewe to English', 'Subtitling short videos', 'Typing up meeting notes'],
    rate: 100,
    mode: 'remote',
  },
  {
    icon: Telescope,
    title: 'Online Research & Listings',
    description: 'Finding suppliers, building contact lists, and price checks.',
    image: '/categories/electrical.jpg',
    tasks: ['Building supplier lists', 'Competitor price checks', 'Verifying business contacts', 'Collecting market prices'],
    rate: 100,
    mode: 'remote',
  },
  {
    icon: CalendarCheck,
    title: 'Virtual Assistance',
    description: 'Scheduling, reminders, and day-to-day admin for busy owners.',
    image: '/categories/construction.jpg',
    tasks: ['Managing a booking diary', 'Sending payment reminders', 'Organising documents', 'Following up on orders'],
    rate: 130,
    mode: 'remote',
  },
]

/** Every category, field and remote. */
export const allCategories: Category[] = [...categories, ...remoteCategories]

export const isRemote = (title: string) =>
  remoteCategories.some((c) => c.title === title)

// ---------------------------------------------------------------------------
// Logistics & Delivery pricing helpers
// ---------------------------------------------------------------------------

export const LOGISTICS_BASE_KM = 3          // km included in base fee
export const LOGISTICS_BASE_FEE = 40        // GHS
export const LOGISTICS_PER_KM = 10          // GHS per km beyond 3km
export const LOGISTICS_SKILLED_ADDON = 30   // GHS for inventory handling / documentation
export const LOGISTICS_LONGHAUL_CAP = 210   // GHS flat cap beyond 20km (pending final sign-off)
export const LOGISTICS_LONGHAUL_KM = 20     // km threshold for the cap

export const VEHICLE_SURCHARGES: { label: string; value: number; note?: string }[] = [
  { label: 'On foot / handcart', value: 0, note: '≤3km only' },
  { label: 'Bicycle', value: 15 },
  { label: 'Motorbike', value: 30 },
  { label: 'Car / van', value: 50 },
]

/**
 * Calculate the total logistics rate for a delivery run.
 * - distanceKm: GPS-derived pickup-to-dropoff distance
 * - skilled: inventory handling, documentation, etc.
 * - vehicleSurcharge: one of VEHICLE_SURCHARGES[].value
 */
export function logisticsRate(distanceKm: number, skilled: boolean, vehicleSurcharge: number): number {
  const distanceFee = distanceKm <= LOGISTICS_BASE_KM
    ? LOGISTICS_BASE_FEE
    : Math.min(
        LOGISTICS_BASE_FEE + (distanceKm - LOGISTICS_BASE_KM) * LOGISTICS_PER_KM,
        distanceKm > LOGISTICS_LONGHAUL_KM ? LOGISTICS_LONGHAUL_CAP : Infinity
      )
  const skilledAddon = skilled ? LOGISTICS_SKILLED_ADDON : 0
  return Math.round(distanceFee + skilledAddon + vehicleSurcharge)
}

// Tool-provision surcharge — applies to Agriculture, Construction, Facility & Cleaning
export const TOOL_SURCHARGE_RATE = 0.15   // +15% when worker provides tools

export interface Step {
  number: string
  title: string
  description: string
}

export const steps: Step[] = [
  {
    number: '01',
    title: 'Post a task or pick a worker',
    description:
      'Describe the job you need done — or browse verified worker profiles and dispatch someone directly.',
  },
  {
    number: '02',
    title: 'We match and confirm',
    description: 'We confirm the skill match and agree on timing.',
  },
  {
    number: '03',
    title: 'Work begins — GPS-verified',
    description:
      'Attendance is logged through GPS check-in at your site. Real-time confirmation your worker arrived.',
  },
  {
    number: '04',
    title: 'Pay securely via mobile money',
    description:
      'When the task is complete and approved, payment is settled through secure mobile money. The worker keeps 100% of the task rate.',
  },
]

export interface Pillar { title: string; description: string }

export const pillars: Pillar[] = [
  {
    title: 'Safety & Trust',
    description:
      "Every worker is cleared through BeyondX's own vetting process. GPS-tracked attendance ensures employers always know who is on site and when.",
  },
  {
    title: 'Economic Dignity',
    description:
      'Workers earn a fair market wage, paid promptly via mobile money. Earnings support both the worker and family stability.',
  },
  {
    title: 'Lasting Opportunity',
    description:
      'BeyondX is not a one-time placement — it is a pathway. Workers build verified records that open doors to permanent employment.',
  },
]

export interface Stat { value: string; label: string }

export const stats: Stat[] = [
  { value: '15%', label: 'Service fee per completed job' },
  { value: '100%', label: 'Paid directly to the worker' },
  { value: '7', label: 'Certified skill categories' },
  { value: '100%', label: 'GPS-verified attendance' },
]

export interface Story { tag: string; title: string; excerpt: string; image: string }

export const stories: Story[] = [
  {
    tag: 'News',
    title: 'BeyondX partners with Accra Metropolitan Assembly for city maintenance pilot',
    excerpt: 'Twelve workers deployed across three municipal sites in a six-week pilot programme.',
    image: 'https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    tag: 'Events',
    title: 'BeyondX joins the Ghana Employers Association as impact partner',
    excerpt: 'A new partnership to promote verified, skills-based hiring across member organisations.',
    image: 'https://images.pexels.com/photos/7149172/pexels-photo-7149172.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    tag: 'Stories',
    title: "Kwame's story: from release to head of site team in eight months",
    excerpt: 'How a construction certification and a GPS-verified work record opened new doors.',
    image: 'https://images.pexels.com/photos/8961342/pexels-photo-8961342.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
]

export interface InstagramPost { image: string; caption: string }

export const instagramPosts: InstagramPost[] = [
  {
    image: 'https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Day 3 on site in East Legon. Masonry team delivering.',
  },
  {
    image: 'https://images.pexels.com/photos/8961342/pexels-photo-8961342.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Skills certification session with our newest cohort.',
  },
  {
    image: 'https://images.pexels.com/photos/8961082/pexels-photo-8961082.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'GPS check-in confirmed. Another job underway in Tema.',
  },
  {
    image: 'https://images.pexels.com/photos/4489702/pexels-photo-4489702.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Logistics team loading up for a big move in Osu.',
  },
  {
    image: 'https://images.pexels.com/photos/3238930/pexels-photo-3238930.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Finishing touches on a painting job in Labone.',
  },
  {
    image: 'https://images.pexels.com/photos/1453974/pexels-photo-1453974.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Groundskeeping crew transforming a community space.',
  },
]
