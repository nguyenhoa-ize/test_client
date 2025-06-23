export interface User {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  related_type?: string;
  related_id?: string;
  created_at: string;
  sender?: User;
}