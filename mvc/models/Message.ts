export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  isRead: boolean;
  attachments?: MessageAttachment[];
  replyToId?: string;
  metadata?: MessageMetadata;
  senderEmail?: string;
  senderName?: string;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  BOOKING_REQUEST = 'booking_request',
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_CANCELLATION = 'booking_cancellation',
  PAYMENT_REQUEST = 'payment_request',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  SYSTEM = 'system'
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  thumbnailUrl?: string;
}

export interface MessageMetadata {
  bookingId?: string;
  serviceId?: string;
  eventId?: string;
  hiringRequestId?: string;
  proposalId?: string;
  actionRequired?: boolean;
  actionType?: string;
  expiresAt?: Date;
}

export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  lastMessage?: Message | string; // Can be Message object or string content
  lastMessageTime: Date;
  unreadCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ConversationMetadata;
  otherParticipant?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ConversationMetadata {
  bookingId?: string;
  serviceId?: string;
  eventId?: string;
  subject?: string;
  priority?: 'low' | 'medium' | 'high';
}

export class MessageModel {
  constructor(
    public id: string = '',
    public conversationId: string = '',
    public senderId: string = '',
    public receiverId: string = '',
    public content: string = '',
    public messageType: MessageType = MessageType.TEXT,
    public timestamp: Date = new Date(),
    public isRead: boolean = false,
    public attachments: MessageAttachment[] = [],
    public replyToId: string = '',
    public metadata: MessageMetadata = {}
  ) {}

  // Check if message is recent (within last 5 minutes)
  isRecent(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.timestamp > fiveMinutesAgo;
  }

  // Check if message has attachments
  hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  // Get message preview (first 100 characters)
  getPreview(): string {
    if (this.content.length <= 100) return this.content;
    return this.content.substring(0, 100) + '...';
  }

  // Check if message requires action
  requiresAction(): boolean {
    return this.metadata?.actionRequired === true;
  }

  // Validate message data
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.conversationId) errors.push('Conversation ID is required');
    if (!this.senderId) errors.push('Sender ID is required');
    if (!this.receiverId) errors.push('Receiver ID is required');
    if (!this.content.trim() && this.messageType === MessageType.TEXT) {
      errors.push('Message content is required for text messages');
    }
    if (this.senderId === this.receiverId) errors.push('Sender and receiver cannot be the same');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export class ConversationModel {
  constructor(
    public id: string = '',
    public participants: string[] = [],
    public lastMessage: Message | null = null,
    public lastMessageTime: Date = new Date(),
    public unreadCount: number = 0,
    public isActive: boolean = true,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public metadata: ConversationMetadata = {}
  ) {}

  // Add participant to conversation
  addParticipant(userId: string): void {
    if (!this.participants.includes(userId)) {
      this.participants.push(userId);
    }
  }

  // Remove participant from conversation
  removeParticipant(userId: string): void {
    this.participants = this.participants.filter(id => id !== userId);
  }

  // Check if user is participant
  isParticipant(userId: string): boolean {
    return this.participants.includes(userId);
  }

  // Mark conversation as read
  markAsRead(): void {
    this.unreadCount = 0;
  }

  // Increment unread count
  incrementUnreadCount(): void {
    this.unreadCount++;
  }

  // Update last message
  updateLastMessage(message: Message): void {
    this.lastMessage = message;
    this.lastMessageTime = message.timestamp;
    this.updatedAt = new Date();
  }

  // Validate conversation data
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.participants.length < 2) {
      errors.push('Conversation must have at least 2 participants');
    }
    if (this.unreadCount < 0) {
      errors.push('Unread count cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
















