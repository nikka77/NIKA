export type BadgeTier = 'founder' | 'pioneer' | 'initie' | 'member';
export type KycLevel = 0 | 1 | 2 | 3;

export interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  xp: number;
  level: number;
  level_name: string;
  nika_credits: number;
  wallet_address?: string;
  is_pro: boolean;
  created_at: string;
  // NIKA — numérotation séquentielle + badges HxH + KYC
  number?: number;
  badge_tier?: BadgeTier;
  kyc_level?: KycLevel;
  is_verified?: boolean;
  verified_at?: string | null;
  pro_domains?: string[];
  city?: string | null;
  bio?: string | null;
  updated_at?: string;
}

export interface Pro {
  id: string;
  user_id: string;
  domain: string;
  business_name: string;
  description?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  verified: boolean;
  active: boolean;
  rating: number;
  review_count: number;
  google_place_id?: string;
  created_at: string;
}

export interface Listing {
  id: string;
  pro_id: string;
  domain: string;
  title: string;
  description?: string;
  price?: number;
  currency: string;
  stock?: number;
  available: boolean;
  images?: string[];
  metadata?: Record<string, unknown>;
  affil_url?: string;
  created_at: string;
  pro?: Pro;
}

export interface Order {
  id: string;
  user_id: string;
  pro_id: string;
  listing_id: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  amount: number;
  nika_credits_used: number;
  stripe_payment_id?: string;
  created_at: string;
}

export interface POI {
  id: string;
  creator_id: string;
  lat: number;
  lng: number;
  category: string;
  name: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  upvotes: number;
  created_at: string;
}

export interface News {
  id: string;
  author_id: string;
  title: string;
  content: string;
  category?: string;
  ai_moderated: boolean;
  ai_reformulation?: string;
  published: boolean;
  upvotes: number;
  source_url?: string;
  created_at: string;
  author?: User;
}

export interface FlashDeal {
  id: string;
  pro_id: string;
  title: string;
  description?: string;
  discount_type: 'percent' | 'fixed' | 'free_item';
  discount_value: number;
  expires_at: string;
  active: boolean;
  created_at: string;
  pro?: Pro;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  action: string;
  xp_amount: number;
  created_at: string;
}
