import { MessagingService } from '../services/MessagingService';
import {
  Message,
  MessageType,
  Conversation,
  MessageAttachment,
  MessageMetadata,
} from '../models/Message';

export class MessagingController {
  private messagingService: MessagingService;

  constructor() {
    this.messagingService = MessagingService.getInstance();
  }

  // Send text message
  async sendTextMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!content.trim()) {
        return {
          success: false,
          error: 'Message content cannot be empty',
        };
      }

      return await this.messagingService.sendMessage(
        conversationId,
        senderId,
        receiverId,
        content,
        MessageType.TEXT,
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.sendTextMessage:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  // Send message with attachments
  async sendMessageWithAttachments(
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
    attachments: MessageAttachment[],
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const messageType = attachments.some((att) => att.fileType.startsWith('image/'))
        ? MessageType.IMAGE
        : MessageType.FILE;

      return await this.messagingService.sendMessage(
        conversationId,
        senderId,
        receiverId,
        content,
        messageType,
        attachments,
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.sendMessageWithAttachments:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message with attachments',
      };
    }
  }

  // Create or get conversation
  async createOrGetConversation(
    participant1Id: string,
    participant2Id: string,
    metadata?: any,
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      return await this.messagingService.createOrGetConversation(
        participant1Id,
        participant2Id,
        metadata,
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.createOrGetConversation:', error);
      return {
        success: false,
        error: error.message || 'Failed to create or get conversation',
      };
    }
  }

  // Get conversation by ID
  async getConversation(
    conversationId: string,
  ): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    try {
      const conversation = await this.messagingService.getConversation(conversationId);
      if (conversation) {
        return {
          success: true,
          conversation,
        };
      } else {
        return {
          success: false,
          error: 'Conversation not found',
        };
      }
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.getConversation:', error);
      return {
        success: false,
        error: error.message || 'Failed to get conversation',
      };
    }
  }

  // Get user conversations
  async getUserConversations(
    userId: string,
  ): Promise<{ success: boolean; conversations?: Conversation[]; error?: string }> {
    try {
      const conversations = await this.messagingService.getUserConversations(userId);
      return {
        success: true,
        conversations,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.getUserConversations:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user conversations',
      };
    }
  }

  // Get conversation messages
  async getConversationMessages(
    conversationId: string,
    limit?: number,
  ): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      const messages = await this.messagingService.getConversationMessages(
        conversationId,
        limit || 50,
      );
      return {
        success: true,
        messages,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.getConversationMessages:', error);
      return {
        success: false,
        error: error.message || 'Failed to get conversation messages',
      };
    }
  }

  // Mark messages as read
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.messagingService.markMessagesAsRead(conversationId, userId);
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.markMessagesAsRead:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark messages as read',
      };
    }
  }

  // Send booking-related message
  async sendBookingMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    bookingId: string,
    messageType: MessageType,
    content: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      return await this.messagingService.sendBookingMessage(
        conversationId,
        senderId,
        receiverId,
        bookingId,
        messageType,
        content,
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.sendBookingMessage:', error);
      return {
        success: false,
        error: error.message || 'Failed to send booking message',
      };
    }
  }

  // Send system message
  async sendSystemMessage(
    conversationId: string,
    receiverId: string,
    content: string,
    metadata?: MessageMetadata,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      return await this.messagingService.sendSystemMessage(
        conversationId,
        receiverId,
        content,
        metadata,
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.sendSystemMessage:', error);
      return {
        success: false,
        error: error.message || 'Failed to send system message',
      };
    }
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.messagingService.deleteMessage(messageId);
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.deleteMessage:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete message',
      };
    }
  }

  // Archive conversation
  async archiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.messagingService.archiveConversation(conversationId, userId);
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.archiveConversation:', error);
      return {
        success: false,
        error: error.message || 'Failed to archive conversation',
      };
    }
  }

  // Get unread message count
  async getUnreadMessageCount(
    userId: string,
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const count = await this.messagingService.getUnreadMessageCount(userId);
      return {
        success: true,
        count,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.getUnreadMessageCount:', error);
      return {
        success: false,
        error: error.message || 'Failed to get unread message count',
      };
    }
  }

  // Search messages
  async searchMessages(
    conversationId: string,
    searchTerm: string,
  ): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      if (!searchTerm.trim()) {
        return {
          success: true,
          messages: [],
        };
      }

      const messages = await this.messagingService.searchMessages(conversationId, searchTerm);
      return {
        success: true,
        messages,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in MessagingController.searchMessages:', error);
      return {
        success: false,
        error: error.message || 'Failed to search messages',
      };
    }
  }

  // Real-time message updates
  subscribeToConversationMessages(
    conversationId: string,
    callback: (messages: Message[]) => void,
  ): () => void {
    return this.messagingService.subscribeToConversationMessages(conversationId, callback);
  }

  // Real-time conversation updates
  subscribeToUserConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void,
  ): () => void {
    return this.messagingService.subscribeToUserConversations(userId, callback);
  }

  // Cleanup
  cleanup(): void {
    this.messagingService.cleanup();
  }
}
