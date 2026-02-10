import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { MessagingController } from '../../controllers/MessagingController';
import { Message, MessageType, Conversation } from '../../models/Message';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';

const { width } = Dimensions.get('window');

interface MessagingViewProps {
  userId: string;
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ userId, user, onNavigate, onLogout }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'recent'>('all');

  const messagingController = new MessagingController();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadConversations();
    loadUnreadCount();

    const unsubscribeConversations = messagingController.subscribeToUserConversations(
      userId,
      (updatedConversations) => {
        setConversations(updatedConversations);
      }
    );

    return () => {
      unsubscribeConversations();
      messagingController.cleanup();
    };
  }, [userId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);

      const unsubscribeMessages = messagingController.subscribeToConversationMessages(
        selectedConversation.id,
        (updatedMessages) => {
          setMessages(updatedMessages);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );

      messagingController.markMessagesAsRead(selectedConversation.id, userId);

      return () => {
        unsubscribeMessages();
      };
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    setLoading(true);
    const result = await messagingController.getUserConversations(userId);
    if (result.success && result.conversations) {
      setConversations(result.conversations);
    }
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const result = await messagingController.getConversationMessages(conversationId);
    if (result.success && result.messages) {
      setMessages(result.messages);
    }
  };

  const loadUnreadCount = async () => {
    const result = await messagingController.getUnreadMessageCount(userId);
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;

    setSending(true);
    const result = await messagingController.sendTextMessage(
      selectedConversation.id,
      userId,
      getOtherParticipantId(),
      messageText.trim()
    );

    setSending(false);

    if (result.success) {
      setMessageText('');
    } else {
      console.error('Failed to send message:', result.error);
    }
  };

  const getOtherParticipantId = (): string => {
    if (!selectedConversation) return '';
    return selectedConversation.participants.find(id => id !== userId) || '';
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return messageDate.toLocaleDateString();
  };

  const getMessageTypeIcon = (messageType: MessageType): string => {
    switch (messageType) {
      case MessageType.BOOKING_REQUEST: return '📅';
      case MessageType.BOOKING_CONFIRMATION: return '✅';
      case MessageType.BOOKING_CANCELLATION: return '❌';
      case MessageType.PAYMENT_REQUEST: return '💳';
      case MessageType.PAYMENT_CONFIRMATION: return '💰';
      case MessageType.SYSTEM: return '🔔';
      case MessageType.IMAGE: return '🖼️';
      case MessageType.FILE: return '📎';
      default: return '💬';
    }
  };

  const getFilteredConversations = (): Conversation[] => {
    let filtered = conversations;

    // Filter by type
    if (filterType === 'unread') {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    } else if (filterType === 'recent') {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      filtered = filtered.filter(conv => new Date(conv.lastMessageTime) > oneDayAgo);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        const otherParticipantId = conv.participants.find(id => id !== userId) || '';
        const lastMessageContent = typeof conv.lastMessage === 'string'
          ? conv.lastMessage.toLowerCase()
          : conv.lastMessage?.content.toLowerCase() || '';
        return otherParticipantId.toLowerCase().includes(query) ||
               lastMessageContent.includes(query);
      });
    }

    return filtered;
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.senderId === userId;
    const isSystemMessage = message.messageType === MessageType.SYSTEM;

    if (isSystemMessage) {
      return (
        <View key={message.id} style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>
            {getMessageTypeIcon(message.messageType)} {message.content}
          </Text>
          <Text style={styles.systemMessageTime}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      );
    }

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          {message.messageType !== MessageType.TEXT && (
            <Text style={styles.messageTypeIcon}>
              {getMessageTypeIcon(message.messageType)}
            </Text>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.content}
          </Text>
        </View>
        <Text style={[
          styles.messageTime,
          isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
        ]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    );
  };

  const renderConversationItem = (conversation: Conversation) => {
    const otherParticipantId = conversation.participants.find(id => id !== userId) || '';
    const hasUnread = conversation.unreadCount > 0;

    return (
      <TouchableOpacity
        key={conversation.id}
        style={[styles.conversationItem, hasUnread && styles.unreadConversation]}
        onPress={() => setSelectedConversation(conversation)}
      >
        <View style={styles.conversationAvatar}>
          <Text style={styles.conversationAvatarText}>
            {otherParticipantId.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle}>
              User {otherParticipantId.substring(0, 8)}
            </Text>
            <Text style={styles.conversationTime}>
              {formatTime(conversation.lastMessageTime)}
            </Text>
          </View>
          <Text style={[
            styles.conversationPreview,
            hasUnread && styles.unreadPreview
          ]} numberOfLines={1}>
            {typeof conversation.lastMessage === 'string'
              ? conversation.lastMessage
              : conversation.lastMessage?.content || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <AppLayout
        role="admin"
        activeRoute="messages"
        title="Messages"
        user={user}
        onNavigate={onNavigate!}
        onLogout={onLogout!}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a55e1" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      role="admin"
      activeRoute="messages"
      title="Messages"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      {!selectedConversation ? (
        // Conversations List
        <View style={styles.conversationsContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Messages</Text>
              <Text style={styles.headerSubtitle}>Manage all conversations</Text>
            </View>
            {unreadCount > 0 && (
              <View style={styles.unreadHeaderBadge}>
                <Text style={styles.unreadHeaderCount}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94A3B8"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'unread' && styles.filterButtonActive]}
                onPress={() => setFilterType('unread')}
              >
                <Text style={[styles.filterText, filterType === 'unread' && styles.filterTextActive]}>
                  Unread
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'recent' && styles.filterButtonActive]}
                onPress={() => setFilterType('recent')}
              >
                <Text style={[styles.filterText, filterType === 'recent' && styles.filterTextActive]}>
                  Recent
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.conversationsList}>
            {getFilteredConversations().map(renderConversationItem)}

            {getFilteredConversations().length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>💬</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Messages from users will appear here'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        // Chat View
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => setSelectedConversation(null)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>
                  {getOtherParticipantId().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.chatTitle}>
                  User {getOtherParticipantId().substring(0, 8)}
                </Text>
                <Text style={styles.chatSubtitle}>Active now</Text>
              </View>
            </View>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map(renderMessage)}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              multiline
              maxLength={1000}
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled
              ]}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4a55e1',
  },
  conversationsContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  unreadHeaderBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 28,
    alignItems: 'center',
  },
  unreadHeaderCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#64748B',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  clearIcon: {
    fontSize: 16,
    color: '#94A3B8',
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#4a55e1',
    borderColor: '#4a55e1',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  unreadConversation: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#4a55e1',
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  conversationTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#64748B',
  },
  unreadPreview: {
    fontWeight: '600',
    color: '#1E293B',
  },
  unreadBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4a55e1',
    fontWeight: '600',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  chatSubtitle: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: '#4a55e1',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageTypeIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1E293B',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#94A3B8',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#94A3B8',
    textAlign: 'left',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 14,
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemMessageTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    backgroundColor: '#4a55e1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessagingView;
