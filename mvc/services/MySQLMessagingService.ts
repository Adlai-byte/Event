import { getApiBaseUrl } from './api';
import { Message, Conversation } from '../models/Message';
import { getSocket } from './socketClient';

export class MySQLMessagingService {
  private static instance: MySQLMessagingService;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private socketCleanups: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): MySQLMessagingService {
    if (!MySQLMessagingService.instance) {
      MySQLMessagingService.instance = new MySQLMessagingService();
    }
    return MySQLMessagingService.instance;
  }

  async getUserConversations(userEmail: string): Promise<Conversation[]> {
    try {
      const resp = await fetch(
        `${getApiBaseUrl()}/api/user/conversations?email=${encodeURIComponent(userEmail)}`,
      );
      const data = await resp.json();

      if (data.ok && data.conversations) {
        return data.conversations.map((conv: any) => ({
          id: conv.idconversation.toString(),
          participants: conv.participant_ids
            ? conv.participant_ids.split(',').map((id: string) => id.trim())
            : [],
          lastMessage: conv.last_message || '',
          lastMessageTime: conv.last_message_time ? new Date(conv.last_message_time) : new Date(),
          unreadCount: conv.unread_count || 0,
          isActive: conv.c_is_active === 1,
          createdAt: conv.c_created_at ? new Date(conv.c_created_at) : new Date(),
          updatedAt: conv.c_updated_at ? new Date(conv.c_updated_at) : new Date(),
          metadata: {
            bookingId: conv.c_booking_id ? conv.c_booking_id.toString() : undefined,
            serviceId: conv.c_service_id ? conv.c_service_id.toString() : undefined,
            subject: conv.c_subject,
          },
          otherParticipant: conv.other_participant
            ? {
                id: conv.other_participant.cp_user_id.toString(),
                email: conv.other_participant.u_email,
                name: conv.other_participant.name,
              }
            : null,
        }));
      }
      return [];
    } catch (error) {
      if (__DEV__) console.error('Error getting user conversations:', error);
      return [];
    }
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/conversations/${conversationId}/messages`);
      const data = await resp.json();

      if (data.ok && data.messages) {
        return data.messages.map((msg: any) => ({
          id: msg.idmessage.toString(),
          conversationId: msg.m_conversation_id.toString(),
          senderId: msg.m_sender_id.toString(),
          receiverId: '',
          content: msg.m_content,
          messageType: msg.m_message_type || 'text',
          timestamp: msg.m_created_at ? new Date(msg.m_created_at) : new Date(),
          isRead: msg.m_is_read === 1,
          attachments: [],
          replyToId: msg.m_reply_to_id ? msg.m_reply_to_id.toString() : '',
          metadata: {},
          senderName: msg.sender_name,
          senderEmail: msg.sender_email,
        }));
      }
      return [];
    } catch (error) {
      if (__DEV__) console.error('Error getting conversation messages:', error);
      return [];
    }
  }

  async sendMessage(
    conversationId: string,
    userEmail: string,
    content: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, content: content.trim() }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok && data.message) {
        return { success: true, messageId: data.message.idmessage.toString() };
      }
      return { success: false, error: data.error || 'Failed to send message' };
    } catch (error: any) {
      if (__DEV__) console.error('Error sending message:', error);
      return { success: false, error: error.message || 'Failed to send message' };
    }
  }

  async markMessagesAsRead(
    conversationId: string,
    userEmail: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      const data = await resp.json();
      return { success: data.ok || false, error: data.error };
    } catch (error: any) {
      if (__DEV__) console.error('Error marking messages as read:', error);
      return { success: false, error: error.message };
    }
  }

  subscribeToConversationMessages(
    conversationId: string,
    userEmail: string,
    callback: (messages: Message[]) => void,
    interval: number = 2000,
  ): () => void {
    this.unsubscribeKey(conversationId);

    // Load initial messages
    this.getConversationMessages(conversationId).then(callback);

    const socket = getSocket();
    if (socket?.connected) {
      // Socket-based: join conversation room and listen for new messages
      socket.emit('join-conversation', conversationId);

      const onNewMessage = (data: { conversationId: string }) => {
        if (data.conversationId === conversationId) {
          this.getConversationMessages(conversationId).then(callback);
        }
      };
      socket.on('new-message', onNewMessage);

      this.socketCleanups.set(conversationId, () => {
        socket.off('new-message', onNewMessage);
        socket.emit('leave-conversation', conversationId);
      });
    } else {
      // Fallback: polling when socket unavailable
      const intervalId = setInterval(async () => {
        const messages = await this.getConversationMessages(conversationId);
        callback(messages);
      }, interval);
      this.pollingIntervals.set(conversationId, intervalId);
    }

    return () => this.unsubscribeKey(conversationId);
  }

  subscribeToUserConversations(
    userEmail: string,
    callback: (conversations: Conversation[]) => void,
    interval: number = 3000,
  ): () => void {
    const key = `conversations_${userEmail}`;
    this.unsubscribeKey(key);

    // Load initial conversations
    this.getUserConversations(userEmail).then(callback);

    const socket = getSocket();
    if (socket?.connected) {
      const onUnreadUpdate = () => {
        this.getUserConversations(userEmail).then(callback);
      };
      socket.on('unread-update', onUnreadUpdate);

      this.socketCleanups.set(key, () => {
        socket.off('unread-update', onUnreadUpdate);
      });
    } else {
      // Fallback: polling
      const intervalId = setInterval(async () => {
        const conversations = await this.getUserConversations(userEmail);
        callback(conversations);
      }, interval);
      this.pollingIntervals.set(key, intervalId);
    }

    return () => this.unsubscribeKey(key);
  }

  private unsubscribeKey(key: string): void {
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key)!);
      this.pollingIntervals.delete(key);
    }
    if (this.socketCleanups.has(key)) {
      this.socketCleanups.get(key)!();
      this.socketCleanups.delete(key);
    }
  }

  cleanup(): void {
    this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.pollingIntervals.clear();
    this.socketCleanups.forEach((cleanup) => cleanup());
    this.socketCleanups.clear();
  }
}
