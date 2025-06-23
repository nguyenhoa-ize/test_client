export interface User {
  id: string;
  name: string;
  avatar: string;
  online: boolean
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'system';
  image_urls?: string[];
  reply_to_message_id?: string;
  reply_to_content?: string;
  reply_to_sender_name?: string;
  reply_to_type?: string;
  read_by_count: number;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
  status: 'pending' | 'sent'
}

export interface Conversation {
  id: string;
  name?: string;
  avatar_group?: string;
  type: 'direct' | 'group';
  last_message_at: string;
  updated_at: string;
  other_user?: User;
  unread_count: number;
  last_message?: string;
}