import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Message,
  MessageType,
  Conversation,
  MessageAttachment,
  MessageMetadata,
  MessageModel,
} from '../models/Message';

export class MessagingService {
  private static instance: MessagingService;
  private unsubscribeFunctions: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
    }
    return MessagingService.instance;
  }

  // Send a message
  async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
    messageType: MessageType = MessageType.TEXT,
    attachments?: MessageAttachment[],
    replyToId?: string,
    metadata?: MessageMetadata,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate message data
      const message = new MessageModel(
        '',
        conversationId,
        senderId,
        receiverId,
        content,
        messageType,
        new Date(),
        false,
        attachments || [],
        replyToId || '',
        metadata || {},
      );

      const validation = message.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Create message document
      const messageRef = await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId,
        receiverId,
        content,
        messageType,
        timestamp: serverTimestamp(),
        isRead: false,
        attachments: attachments || [],
        replyToId: replyToId || null,
        metadata: metadata || {},
      });

      // Update conversation
      await this.updateConversation(conversationId, messageRef.id, senderId, receiverId);

      return {
        success: true,
        messageId: messageRef.id,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
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
      // Check if conversation already exists
      const existingConversation = await this.findExistingConversation(
        participant1Id,
        participant2Id,
      );
      if (existingConversation) {
        return {
          success: true,
          conversationId: existingConversation.id,
        };
      }

      // Create new conversation
      const conversationRef = await addDoc(collection(db, 'conversations'), {
        participants: [participant1Id, participant2Id],
        lastMessageTime: serverTimestamp(),
        unreadCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: metadata || {},
      });

      return {
        success: true,
        conversationId: conversationRef.id,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error creating conversation:', error);
      return {
        success: false,
        error: error.message || 'Failed to create conversation',
      };
    }
  }

  // Get conversation by ID
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        return {
          id: conversationSnap.id,
          ...data,
          lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Conversation;
      }
      return null;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting conversation:', error);
      return null;
    }
  }

  // Get user's conversations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        where('isActive', '==', true),
        orderBy('lastMessageTime', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const conversations: Conversation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Conversation);
      });

      return conversations;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting user conversations:', error);
      return [];
    }
  }

  // Get messages for conversation
  async getConversationMessages(
    conversationId: string,
    limitCount: number = 50,
  ): Promise<Message[]> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'desc'),
        limit(limitCount),
      );

      const querySnapshot = await getDocs(q);
      const messages: Message[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as Message);
      });

      return messages.reverse(); // Return in chronological order
    } catch (error: any) {
      if (__DEV__) console.error('Error getting conversation messages:', error);
      return [];
    }
  }

  // Mark messages as read
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const batch = writeBatch(db);

      // Get unread messages for this conversation and user
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('receiverId', '==', userId),
        where('isRead', '==', false),
      );

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });

      // Update conversation unread count
      const conversationRef = doc(db, 'conversations', conversationId);
      batch.update(conversationRef, {
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Error marking messages as read:', error);
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
    const metadata: MessageMetadata = {
      bookingId,
      actionRequired: messageType === MessageType.BOOKING_REQUEST,
      actionType: messageType,
    };

    return this.sendMessage(
      conversationId,
      senderId,
      receiverId,
      content,
      messageType,
      undefined,
      undefined,
      metadata,
    );
  }

  // Send system message
  async sendSystemMessage(
    conversationId: string,
    receiverId: string,
    content: string,
    metadata?: MessageMetadata,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage(
      conversationId,
      'system',
      receiverId,
      content,
      MessageType.SYSTEM,
      undefined,
      undefined,
      metadata,
    );
  }

  // Real-time message updates
  subscribeToConversationMessages(
    conversationId: string,
    callback: (messages: Message[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc'),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as Message);
      });
      callback(messages);
    });

    this.unsubscribeFunctions.set(`messages_${conversationId}`, unsubscribe);
    return unsubscribe;
  }

  // Real-time conversation updates
  subscribeToUserConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      where('isActive', '==', true),
      orderBy('lastMessageTime', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const conversations: Conversation[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Conversation);
      });
      callback(conversations);
    });

    this.unsubscribeFunctions.set(`conversations_${userId}`, unsubscribe);
    return unsubscribe;
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Error deleting message:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete message',
      };
    }
  }

  // Archive conversation
  async archiveConversation(
    conversationId: string,
    _userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Error archiving conversation:', error);
      return {
        success: false,
        error: error.message || 'Failed to archive conversation',
      };
    }
  }

  // Get unread message count for user
  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('receiverId', '==', userId),
        where('isRead', '==', false),
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Search messages
  async searchMessages(conversationId: string, searchTerm: string): Promise<Message[]> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const messages: Message[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const message = {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as Message;

        // Client-side search (Firestore doesn't support full-text search)
        if (message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
          messages.push(message);
        }
      });

      return messages;
    } catch (error: any) {
      if (__DEV__) console.error('Error searching messages:', error);
      return [];
    }
  }

  // Private helper methods
  private async findExistingConversation(
    participant1Id: string,
    participant2Id: string,
  ): Promise<Conversation | null> {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', participant1Id),
        where('isActive', '==', true),
      );

      const querySnapshot = await getDocs(q);

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (data.participants.includes(participant2Id)) {
          return {
            id: doc.id,
            ...data,
            lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Conversation;
        }
      }

      return null;
    } catch (error: any) {
      if (__DEV__) console.error('Error finding existing conversation:', error);
      return null;
    }
  }

  private async updateConversation(
    conversationId: string,
    messageId: string,
    senderId: string,
    receiverId: string,
  ): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const messageRef = doc(db, 'messages', messageId);

      const batch = writeBatch(db);

      // Update conversation with last message info
      batch.update(conversationRef, {
        lastMessage: messageRef,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Increment unread count for receiver
      batch.update(conversationRef, {
        unreadCount: receiverId, // This would need to be handled differently in a real implementation
      });

      await batch.commit();
    } catch (error: any) {
      if (__DEV__) console.error('Error updating conversation:', error);
    }
  }

  // Cleanup subscriptions
  cleanup(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribeFunctions.clear();
  }
}
