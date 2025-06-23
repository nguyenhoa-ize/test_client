export interface SharedPostType {
    id: string;
    user_id: string;
    first_name?: string;
    last_name?: string;
    content?: string;
    created_at?: string;
    date?: string;
    images?: string[];
    avatar_url?: string;
    feeling?: { icon: string; label: string };
    location?: string;
    likes?: number;
    comments?: number;
    shares?: number;
}

export interface PostType {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    content: string;
    created_at: string;
    type_post: "positive" | "negative";
    like_count: number;
    comment_count: number;
    shares: number;
    images: string[];
    avatar_url?: string;
    feeling?: { icon: string; label: string } | null;
    location?: string | null;
    is_approved?: boolean;
    is_liked?: boolean;
    shared_post_id?: string;
    shared_post?: SharedPostType | null;
} 