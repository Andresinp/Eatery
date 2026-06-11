export type ListingType = "table" | "market";

export interface BaseListing {
  id: string;
  listing_type: ListingType;
  title: string;
  description: string;
  photo: string;
  host_name: string;
  host_avatar: string;
  host_rating: number;
  host_verified: boolean;
  cuisine_tags: string[];
  dietary_tags: string[];
  allergen_flags: string[];
  price_per_unit: number;
  currency: string;
  location_lat: number;
  location_lng: number;
  location_display: string;
}

export interface TableListing extends BaseListing {
  listing_type: "table";
  meal_time: string;
  seats_total: number;
  seats_available: number;
  dining_setting: string;
}

export interface MarketListing extends BaseListing {
  listing_type: "market";
  product_type_tags: string[];
  quantity_total: number;
  quantity_available: number;
  pickup_window_start: string;
  pickup_window_end: string;
}

export type Listing = TableListing | MarketListing;
