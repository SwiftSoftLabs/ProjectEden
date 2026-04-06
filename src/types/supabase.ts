
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    has_completed_onboarding: boolean
                    streak: number | null
                    last_streak_date: string | null
                    updated_at: string | null
                    subscription_tier: string | null
                    selected_background: string | null
                }
                Insert: {
                    id: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    has_completed_onboarding?: boolean
                    streak?: number | null
                    last_streak_date?: string | null
                    updated_at?: string | null
                    subscription_tier?: string | null
                    selected_background?: string | null
                }
                Update: {
                    id?: string
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    has_completed_onboarding?: boolean
                    streak?: number | null
                    last_streak_date?: string | null
                    updated_at?: string | null
                    subscription_tier?: string | null
                    selected_background?: string | null
                }
            }
            plants: {
                Row: {
                    id: string
                    user_id: string
                    species_id: string
                    name: string | null
                    common_name: string | null
                    growth_stage: number
                    health: number
                    last_watered: string | null
                    added_at: string | null
                    position: number | null
                    was_neglected: boolean
                    target_growth_stage: number
                }
                Insert: {
                    id: string
                    user_id: string
                    species_id: string
                    name?: string | null
                    common_name?: string | null
                    growth_stage?: number
                    health?: number
                    last_watered?: string | null
                    added_at?: string | null
                    position?: number | null
                    was_neglected?: boolean
                    target_growth_stage?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    species_id?: string
                    name?: string | null
                    common_name?: string | null
                    growth_stage?: number
                    health?: number
                    last_watered?: string | null
                    added_at?: string | null
                    position?: number | null
                    was_neglected?: boolean
                    target_growth_stage?: number
                }
            }
        }
    }
}
