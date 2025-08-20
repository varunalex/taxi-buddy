import PocketBase from 'pocketbase';

// PocketBase instance URL (replace with your actual URL)
export const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://192.168.31.205:8090/';

// Create PocketBase client instance
export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation globally to prevent request conflicts
pb.autoCancellation(false);

// Types for our collections
export interface Trip {
  id: string;
  date: string;
  start_time: string;
  duration: number; // in minutes
  distance: number; // in km
  fuel_used: number; // in liters
  fare: number;
  tips: number;
  platform: string;
  notes: string;
  driver_id: string;
  created: string;
  updated: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'expense';
  driver_id: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
  created: string;
  updated: string;
}

export interface Expense {
  id: string;
  amount: number;
  category_id: string;
  date: string;
  description: string;
  trip_id?: string;
  driver_id: string;
  created: string;
  updated: string;
}

export interface Platform {
  id: string;
  name: string;
  driver_id: string;
  created: string;
  updated: string;
}

// Helper functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatDistance = (distance: number): string => {
  return `${distance.toFixed(1)} km`;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};
