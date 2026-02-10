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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MySQLMessagingService } from '../../services/MySQLMessagingService';
import { getApiBaseUrl } from '../../services/api';
import { Message, MessageType, Conversation } from '../../models/Message';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface MessagingViewProps {
  userId: string;
  user?: User;
  onBack: () => void;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ userId, user, onBack, onNavigate, onLogout }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagingService = MySQLMessagingService.getInstance();
  const scrollViewRef = useRef<ScrollView>(null);
  const userEmail = user?.email || '';

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    loadConversations();
    loadUnreadCount();

    const unsubscribeConversations = messagingService.subscribeToUserConversations(
      userEmail,
      (updatedConversations) => {
        setConversations(updatedConversations);
      }
    );

    return () => {
      unsubscribeConversations();
      messagingService.cleanup();
    };
  }, [userEmail]);

  useEffect(() => {
    if (selectedConversation && userEmail) {
      loadMessages(selectedConversation.id);
      
      const unsubscribeMessages = messagingService.subscribeToConversationMessages(
        selectedConversation.id,
        userEmail,
        (updatedMessages) => {
          setMessages(updatedMessages);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );

      messagingService.markMessagesAsRead(selectedConversation.id, userEmail);

      return () => {
        unsubscribeMessages();
      };
    }
  }, [selectedConversation, userEmail]);

  const loadConversations = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const convs = await messagingService.getUserConversations(userEmail);
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await messagingService.getConversationMessages(conversationId);
      setMessages(msgs);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadUnreadCount = async () => {
    if (!userEmail) return;
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/user/messages/count?email=${encodeURIComponent(userEmail)}`);
      const data = await resp.json();
      if (data.ok) {
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending || !userEmail) return;

    setSending(true);
    const result = await messagingService.sendMessage(
      selectedConversation.id,
      userEmail,
      messageText.trim()
    );

    setSending(false);

    if (result.success) {
      setMessageText('');
      // Reload messages to show the new one
      loadMessages(selectedConversation.id);
    } else {
      console.error('Failed to send message:', result.error);
      Alert.alert('Error', result.error || 'Failed to send message');
    }
  };

  const getOtherParticipantName = (): string => {
    if (!selectedConversation) return 'User';
    if (selectedConversation.otherParticipant) {
      return selectedConversation.otherParticipant.name || selectedConversation.otherParticipant.email || 'User';
    }
    return 'User';
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const renderMessage = (message: Message) => {
    const isOwnMessage = userEmail && message.senderEmail === userEmail;
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
    const hasUnread = conversation.unreadCount > 0;
    const otherParticipant = conversation.otherParticipant;
    const displayName = otherParticipant 
      ? (otherParticipant.name || otherParticipant.email || 'Client')
      : 'Client';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'C';

    return (
      <TouchableOpacity
        key={conversation.id}
        style={[styles.conversationItem, hasUnread && styles.unreadConversation]}
        onPress={() => setSelectedConversation(conversation)}
      >
        <View style={styles.conversationAvatar}>
          <Text style={styles.conversationAvatarText}>
            {initials}
          </Text>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle}>
              {displayName}
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
              : (conversation.lastMessage?.content || 'No messages yet')}
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
        role="provider"
        activeRoute="messages"
        title="Messages"
        user={user}
        onNavigate={(route) => onNavigate?.(route)}
        onLogout={() => onLogout?.()}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      role="provider"
      activeRoute="messages"
      title="Messages"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <View style={styles.container}>
        {!selectedConversation ? (
          // Conversations List
          <View style={styles.conversationsContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Messages</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadHeaderBadge}>
                  <Text style={styles.unreadHeaderCount}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <ScrollView style={styles.conversationsList}>
              {conversations.map(renderConversationItem)}

              {conversations.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No conversations yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Messages from clients will appear here
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
              <Text style={styles.chatTitle}>
                {getOtherParticipantName()}
              </Text>
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
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C63FF',
  },
  conversationsContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobile ? 12 : 20,
    paddingVertical: isMobile ? 12 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: isMobile ? 14 : 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  unreadHeaderBadge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadHeaderCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
    borderBottomColor: '#E9ECEF',
  },
  unreadConversation: {
    backgroundColor: '#F0F8FF',
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C63FF',
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
    color: '#2D3436',
  },
  conversationTime: {
    fontSize: 12,
    color: '#A4B0BE',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#636E72',
  },
  unreadPreview: {
    fontWeight: '600',
    color: '#2D3436',
  },
  unreadBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: '#F44336',
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
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#636E72',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A4B0BE',
    textAlign: 'center',
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
    borderBottomColor: '#E9ECEF',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#6C63FF',
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
    color: '#2D3436',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#A4B0BE',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#A4B0BE',
    textAlign: 'left',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 14,
    color: '#636E72',
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemMessageTime: {
    fontSize: 10,
    color: '#A4B0BE',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#A4B0BE',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessagingView;








