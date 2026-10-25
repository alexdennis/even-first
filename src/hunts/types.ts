// Shared between the glasses app (src/) and the generator (scripts/generate-hunt/).
// Plain types only — no runtime code — so both sides can import this safely.

export interface Landmark {
  /** Stable slug, e.g. "biscuit-bitch". Used as the localStorage progress key. */
  id: string
  name: string
  lat: number
  lng: number
  address: string
  /** Optional flavor text shown on the glasses alongside the landmark name. */
  hint?: string
  /** Overrides the app-wide default check-in radius (meters) for this landmark. */
  radiusMeters?: number
}

export interface Hunt {
  /** Stable slug, e.g. "hot-dogs-downtown-seattle". Namespaces progress in localStorage. */
  id: string
  /** Shown in the hunt picker list. */
  title: string
  /** Raw --theme input the hunt was generated from. */
  theme: string
  /** Raw --location input the hunt was generated from, e.g. "Downtown Seattle, WA". */
  locationLabel: string
  landmarks: Landmark[]
}
