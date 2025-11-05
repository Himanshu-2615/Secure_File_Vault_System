import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createSupabaseClient(supabaseUrl, publicAnonKey);

export type Database = {
  public: {
    Tables: {
      kv_store_7f2aa9ae: {
        Row: {
          key: string;
          value: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: any;
        };
        Update: {
          key?: string;
          value?: any;
        };
      };
    };
  };
};
