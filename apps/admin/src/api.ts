import type {
  Badge,
  BusinessType,
  Currency,
  Locale,
  Orientation,
  Region,
  Role,
  SceneSettings,
  SceneView,
  ScreenSchedule,
  TemplateId,
  Variant,
} from '@dm/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api${url}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'x-dm-client': '1',
      ...(body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'error', data?.details);
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body: unknown = {}) => request<T>('POST', url, body),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
};

export interface PublicConfig {
  region: Region;
  brandName: string;
  otherRegionUrl: string | null;
  currency: Currency;
  locale: Locale;
  timezone: string;
}

export interface OrgSummary {
  id: string;
  name: string;
  region: Region;
  currency: Currency;
  locale: Locale;
  businessType: BusinessType;
  role: Role;
}

export interface Me {
  user: { id: string; email: string; name: string; locale: Locale };
  orgs: OrgSummary[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
}

export interface Category {
  id: string;
  name: string;
  nameSecondary: string;
  compliance: 'none' | 'tobacco';
  variantLabels: string[];
  sort: number;
}

export interface Item {
  id: string;
  categoryId: string;
  name: string;
  nameSecondary: string;
  description: string;
  portion: string;
  price: number | null;
  variants: Variant[];
  badges: Badge[];
  imageId: string | null;
  imageUrl: string | null;
  soldOut: boolean;
  hidden: boolean;
  sort: number;
}

export interface Override {
  itemId: string;
  locationId: string;
  soldOut: boolean | null;
  price: number | null;
}

export interface Catalog {
  categories: Category[];
  items: Item[];
  overrides: Override[];
}

export interface Media {
  id: string;
  kind: 'image' | 'video';
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  status: 'processing' | 'ready' | 'failed';
  originalName: string;
  sizeBytes: number;
}

export interface Scene {
  id: string;
  name: string;
  template: TemplateId;
  settings: SceneSettings;
}

export interface Screen {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  orientation: Orientation;
  schedule: ScreenSchedule;
  pairedAt: string | null;
  lastSeenAt: string | null;
  lastStatus: { version: string | null; playerVersion: string; sceneId: string | null; viewport: string; ip?: string } | null;
  online: boolean;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: Role;
  lastLoginAt: string | null;
}

export interface ScenePreview {
  scene: SceneView;
  currency: Currency;
  locale: Locale;
}
