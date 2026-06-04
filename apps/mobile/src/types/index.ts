export interface User {
  id: string;
  phone: string;
  name: string;
  bio: string;
  avatar_url: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  tempId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface Contact {
  id: string;
  contact_id: string;
  name: string;
  phone: string;
  avatar_url: string;
  bio: string;
}

export interface Conversation {
  _id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
