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
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SkeletonListItem } from '../../components/ui';
import { MessagingController } from '../../controllers/MessagingController';
import { Message, MessageType, Conversation } from '../../models/Message';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';
import { colors, semantic } from '../../theme';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface MessagingViewProps {
  userId: string;
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const MessagingView: React.FC<MessagingViewProps> = ({
  userId,
  user,
  onNavigate,
  onLogout,
}) => {
  const { screenWidth } = useBreakpoints();
  const styles = createStyles(screenWidth);

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
      },
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
        },
      );

      messagingController.markMessagesAsRead(selectedConversation.id, userId);

      return () => {
        unsubscribeMessages();
      };
    }
    return undefined;
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
      messageText.trim(),
    );

    setSending(false);

    if (result.success) {
      setMessageText('');
    } else {
      if (__DEV__) console.error('Failed to send message:', result.error);
    }
  };

  const getOtherParticipantId = (): string => {
    if (!selectedConversation) return '';
    return selectedConversation.participants.find((id) => id !== userId) || '';
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const _formatDate = (date: Date): string => {
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
      case MessageType.BOOKING_REQUEST:
        return 'calendar';
      case MessageType.BOOKING_CONFIRMATION:
        return 'check-circle';
      case MessageType.BOOKING_CANCELLATION:
        return 'x-circle';
      case MessageType.PAYMENT_REQUEST:
        return 'credit-card';
      case MessageType.PAYMENT_CONFIRMATION:
        return 'dollar-sign';
      case MessageType.SYSTEM:
        return 'bell';
      case MessageType.IMAGE:
        return 'image';
      case MessageType.FILE:
        return 'paperclip';
      default:
        return 'message-circle';
    }
  };

  const getFilteredConversations = (): Conversation[] => {
    let filtered = conversations;

    // Filter by type
    if (filterType === 'unread') {
      filtered = filtered.filter((conv) => conv.unreadCount > 0);
    } else if (filterType === 'recent') {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      filtered = filtered.filter((conv) => new Date(conv.lastMessageTime) > oneDayAgo);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((conv) => {
        const otherParticipantId = conv.participants.find((id) => id !== userId) || '';
        const lastMessageContent =
          typeof conv.lastMessage === 'string'
            ? conv.lastMessage.toLowerCase()
            : conv.lastMessage?.content.toLowerCase() || '';
        return (
          otherParticipantId.toLowerCase().includes(query) || lastMessageContent.includes(query)
        );
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather
              name={getMessageTypeIcon(message.messageType) as any}
              size={14}
              color={semantic.textSecondary}
            />
            <Text style={styles.systemMessageText}>{message.content}</Text>
          </View>
          <Text style={styles.systemMessageTime}>{formatTime(message.timestamp)}</Text>
        </View>
      );
    }

    return (
      <View
        key={message.id}
        style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {message.messageType !== MessageType.TEXT && (
            <Feather
              name={getMessageTypeIcon(message.messageType) as any}
              size={16}
              color={isOwnMessage ? semantic.surface : semantic.textSecondary}
              style={{ marginBottom: 4 }}
            />
          )}
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {message.content}
          </Text>
        </View>
        <Text
          style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
          ]}
        >
          {formatTime(message.timestamp)}
        </Text>
      </View>
    );
  };

  const renderConversationItem = (conversation: Conversation) => {
    const otherParticipantId = conversation.participants.find((id) => id !== userId) || '';
    const hasUnread = conversation.unreadCount > 0;

    return (
      <TouchableOpacity
        key={conversation.id}
        style={[styles.conversationItem, hasUnread && styles.unreadConversation]}
        onPress={() => setSelectedConversation(conversation)}
        accessibilityRole="button"
        accessibilityLabel={`Conversation with User ${otherParticipantId.substring(0, 8)}${hasUnread ? `, ${conversation.unreadCount} unread` : ''}`}
      >
        <View style={styles.conversationAvatar}>
          <Text style={styles.conversationAvatarText}>
            {otherParticipantId.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle}>User {otherParticipantId.substring(0, 8)}</Text>
            <Text style={styles.conversationTime}>{formatTime(conversation.lastMessageTime)}</Text>
          </View>
          <Text
            style={[styles.conversationPreview, hasUnread && styles.unreadPreview]}
            numberOfLines={1}
          >
            {typeof conversation.lastMessage === 'string'
              ? conversation.lastMessage
              : conversation.lastMessage?.content || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
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
        <View style={{ padding: 16 }}>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
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
              <Feather
                name="search"
                size={16}
                color={semantic.textSecondary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={semantic.textMuted}
                accessibilityLabel="Search conversations"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Feather name="x" size={16} color={semantic.textMuted} style={{ padding: 4 }} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterType('all')}
                accessibilityRole="button"
                accessibilityLabel="Filter all conversations"
              >
                <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'unread' && styles.filterButtonActive]}
                onPress={() => setFilterType('unread')}
                accessibilityRole="button"
                accessibilityLabel="Filter unread conversations"
              >
                <Text
                  style={[styles.filterText, filterType === 'unread' && styles.filterTextActive]}
                >
                  Unread
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'recent' && styles.filterButtonActive]}
                onPress={() => setFilterType('recent')}
                accessibilityRole="button"
                accessibilityLabel="Filter recent conversations"
              >
                <Text
                  style={[styles.filterText, filterType === 'recent' && styles.filterTextActive]}
                >
                  Recent
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.conversationsList}>
            {getFilteredConversations().map(renderConversationItem)}

            {getFilteredConversations().length === 0 && (
              <View style={styles.emptyState}>
                <Feather
                  name="message-circle"
                  size={48}
                  color={semantic.textSecondary}
                  style={{ marginBottom: 16 }}
                />
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
              accessibilityRole="button"
              accessibilityLabel="Back to conversations"
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
                <Text style={styles.chatTitle}>User {getOtherParticipantId().substring(0, 8)}</Text>
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
              placeholderTextColor={semantic.textMuted}
              accessibilityLabel="Message input"
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              style={[
                styles.sendButton,
                (!messageText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              disabled={!messageText.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
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

const createStyles = (screenWidth: number) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: semantic.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: semantic.primary,
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
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    unreadHeaderBadge: {
      backgroundColor: semantic.error,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 28,
      alignItems: 'center',
    },
    unreadHeaderCount: {
      color: semantic.surface,
      fontSize: 12,
      fontWeight: 'bold',
    },
    searchContainer: {
      backgroundColor: semantic.surface,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: semantic.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    searchIcon: {
      fontSize: 16,
      marginRight: 8,
      color: semantic.textSecondary,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: semantic.textPrimary,
    },
    clearIcon: {
      fontSize: 16,
      color: semantic.textMuted,
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
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    filterButtonActive: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    filterTextActive: {
      color: semantic.surface,
    },
    conversationsList: {
      flex: 1,
    },
    conversationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    unreadConversation: {
      backgroundColor: '#F0F9FF',
      borderLeftWidth: 3,
      borderLeftColor: semantic.primary,
    },
    conversationAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: semantic.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    conversationAvatarText: {
      color: semantic.surface,
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
      color: semantic.textPrimary,
    },
    conversationTime: {
      fontSize: 12,
      color: semantic.textMuted,
    },
    conversationPreview: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    unreadPreview: {
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    unreadBadge: {
      position: 'absolute',
      right: 16,
      top: 16,
      backgroundColor: semantic.error,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
    },
    unreadCount: {
      color: semantic.surface,
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
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: semantic.textSecondary,
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
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: semantic.primary,
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
      backgroundColor: semantic.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    chatAvatarText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: 'bold',
    },
    chatTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    chatSubtitle: {
      fontSize: 12,
      color: semantic.success,
      marginTop: 2,
    },
    messagesContainer: {
      flex: 1,
      backgroundColor: semantic.background,
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
      maxWidth: screenWidth * 0.75,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
    },
    ownMessageBubble: {
      backgroundColor: semantic.primary,
      borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
      backgroundColor: semantic.surface,
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
      color: semantic.surface,
    },
    otherMessageText: {
      color: semantic.textPrimary,
    },
    messageTime: {
      fontSize: 12,
      marginTop: 4,
    },
    ownMessageTime: {
      color: semantic.textMuted,
      textAlign: 'right',
    },
    otherMessageTime: {
      color: semantic.textMuted,
      textAlign: 'left',
    },
    systemMessage: {
      alignItems: 'center',
      marginVertical: 8,
    },
    systemMessageText: {
      fontSize: 14,
      color: semantic.textSecondary,
      backgroundColor: semantic.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    systemMessageTime: {
      fontSize: 10,
      color: semantic.textMuted,
      marginTop: 2,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: semantic.surface,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    messageInput: {
      flex: 1,
      backgroundColor: semantic.background,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      maxHeight: 100,
      marginRight: 12,
      color: semantic.textPrimary,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    sendButton: {
      backgroundColor: semantic.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 20,
    },
    sendButtonDisabled: {
      backgroundColor: colors.neutral[300],
    },
    sendButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default MessagingView;
