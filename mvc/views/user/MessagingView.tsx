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
  Image,
  Alert
} from 'react-native';
import { SkeletonListItem } from '../../components/ui';
import { MySQLMessagingService } from '../../services/MySQLMessagingService';
import { getApiBaseUrl } from '../../services/api';
import { Message, MessageType, Conversation } from '../../models/Message';
import { AppLayout } from '../../components/layout';

const { width, height: screenHeight } = Dimensions.get('window');
const isMobile = width < 768 || Platform.OS !== 'web';

interface MessagingViewProps {
  userId: string;
  userEmail?: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  conversationId?: string; // Optional: to open a specific conversation
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ userId, userEmail, user, conversationId, onNavigate, onLogout }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagingService = MySQLMessagingService.getInstance();
  const scrollViewRef = useRef<ScrollView>(null);
  const hasHandledInitialConversation = useRef(false);
  const conversationIdRef = useRef<string | undefined>(conversationId);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    // Update the ref with current conversationId
    conversationIdRef.current = conversationId;
    
    // Reset the flag when conversationId changes
    hasHandledInitialConversation.current = false;
    
    // Clear selected conversation when conversationId is undefined
    if (!conversationId) {
      setSelectedConversation(null);
    }

    loadConversations();
    loadUnreadCount();
    
      // Subscribe to real-time updates
      const unsubscribeConversations = messagingService.subscribeToUserConversations(
        userEmail,
        (updatedConversations) => {
          // Deduplicate conversations by ID (in case of duplicates from API)
          const uniqueConvs = updatedConversations.filter((conv, index, self) => 
            index === self.findIndex(c => c.id === conv.id)
          );
          
          setConversations(uniqueConvs);
          
          // Use ref to get the current conversationId value (captured at effect time)
          // Only auto-select if conversationId is explicitly provided (not undefined/null/empty)
          // AND we haven't handled it yet
          // This prevents auto-selecting on every polling update (which happens every 2-3 seconds)
          // AND prevents auto-selecting when navigating to messages list without a specific conversation
          const currentConvId = conversationIdRef.current;
          if (currentConvId && currentConvId.trim() !== '' && !hasHandledInitialConversation.current) {
            const conv = uniqueConvs.find(c => c.id === currentConvId);
            if (conv) {
              setSelectedConversation(conv);
              hasHandledInitialConversation.current = true;
            }
          }
          // Do NOT auto-select or clear selection when conversationId is undefined
          // This allows users to manually select conversations without interference
        }
      );

    return () => {
      unsubscribeConversations();
      messagingService.cleanup();
    };
  }, [userId, userEmail, conversationId]);

  useEffect(() => {
    if (selectedConversation && userEmail) {
      loadMessages(selectedConversation.id);
      
      // Subscribe to real-time message updates
      const unsubscribeMessages = messagingService.subscribeToConversationMessages(
        selectedConversation.id,
        userEmail,
        (updatedMessages) => {
          setMessages(updatedMessages);
          // Auto-scroll to bottom when new messages arrive
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );

      // Mark messages as read
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
      
      // Deduplicate conversations by ID (in case of duplicates from API)
      const uniqueConvs = convs.filter((conv, index, self) => 
        index === self.findIndex(c => c.id === conv.id)
      );
      
      setConversations(uniqueConvs);
      
      // Only auto-select if conversationId is explicitly provided (not undefined/null/empty)
      // AND we haven't handled it yet
      // This prevents auto-selecting on every load AND when navigating to messages list
      if (conversationId && conversationId.trim() !== '' && !selectedConversation && !hasHandledInitialConversation.current) {
        const conv = uniqueConvs.find(c => c.id === conversationId);
        if (conv) {
          setSelectedConversation(conv);
          hasHandledInitialConversation.current = true;
        }
      } else if (!conversationId || conversationId.trim() === '') {
        // Explicitly ensure no conversation is selected when conversationId is undefined or empty
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await messagingService.getConversationMessages(conversationId);
      setMessages(msgs);
      // Auto-scroll to bottom
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
    
    // Prevent sending messages to system conversations
    if (isSystemConversation()) {
      Alert.alert('Read Only', 'You cannot send messages to system notifications. These are read-only messages from the system.');
      return;
    }

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
      // Handle error
      console.error('Failed to send message:', result.error);
      Alert.alert('Error', result.error || 'Failed to send message');
    }
  };

  const getOtherParticipantName = (): string => {
    if (!selectedConversation) return 'Provider';
    if (selectedConversation.otherParticipant) {
      return selectedConversation.otherParticipant.name || selectedConversation.otherParticipant.email || 'Provider';
    }
    return 'Provider';
  };

  const isSystemConversation = (): boolean => {
    if (!selectedConversation) return false;
    // Check if it's a system conversation
    const subject = selectedConversation.metadata?.subject;
    const otherParticipant = selectedConversation.otherParticipant;
    return subject === 'System Notifications' || 
           (otherParticipant && (otherParticipant.name === 'System' || otherParticipant.email === 'system@event.com'));
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
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {message.attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Text style={styles.attachmentName}>{attachment.fileName}</Text>
                  <Text style={styles.attachmentSize}>
                    {(attachment.fileSize / 1024).toFixed(1)} KB
                  </Text>
                </View>
              ))}
            </View>
          )}
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
      ? (otherParticipant.name || otherParticipant.email || 'Provider')
      : 'Provider';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'P';
    
    // Add booking context if available to distinguish conversations with same provider
    const bookingId = conversation.metadata?.bookingId;
    const subject = conversation.metadata?.subject;
    const titleWithContext = bookingId || subject 
      ? `${displayName}${bookingId ? ` (Booking #${bookingId})` : subject ? ` - ${subject}` : ''}`
      : displayName;

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
            <Text style={styles.conversationTitle} numberOfLines={1}>
              {titleWithContext}
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
        role="user"
        activeRoute="messages"
        title="Messages"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
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
      role="user"
      activeRoute="messages"
      title="Messages"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
        {/* Web: Split view with conversations list and chat side by side */}
        {Platform.OS === 'web' ? (
          <View style={styles.webContainer}>
            {/* Conversations List - Always visible on web */}
            <View style={styles.conversationsContainer}>

            <ScrollView style={styles.conversationsList}>
              {conversations.map(renderConversationItem)}
              
              {conversations.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>💬</Text>
                  <Text style={styles.emptyStateText}>No conversations yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Start a conversation by booking a service
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Chat Area - Right side on web */}
          {(() => {
            const os = Platform.OS;
            let keyboardBehavior: 'padding' | 'height' | undefined;
            if (os === 'web') {
              keyboardBehavior = undefined;
            } else if (os === 'ios') {
              keyboardBehavior = 'padding';
            } else {
              keyboardBehavior = 'height';
            }
            return selectedConversation ? (
            <KeyboardAvoidingView 
              style={styles.chatContainer}
              behavior={keyboardBehavior}
            >
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>
                  {getOtherParticipantName()}
                </Text>
              </View>

              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
              >
                {messages.map(renderMessage)}
              </ScrollView>

              {isSystemConversation() ? (
                <View style={styles.systemInputContainer}>
                  <Text style={styles.systemInputText}>
                    ℹ️ System notifications are read-only. You cannot reply to these messages.
                  </Text>
                </View>
              ) : (
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
              )}
            </KeyboardAvoidingView>
            ) : (
            <View style={styles.emptyChatArea}>
              <Text style={styles.emptyChatIcon}>💬</Text>
              <Text style={styles.emptyChatText}>Select a conversation to start messaging</Text>
            </View>
            );
          })()}
        </View>
        ) : (
          /* Mobile: Full screen view */
          <>
        {!selectedConversation ? (
          // Conversations List
          <View style={styles.conversationsContainer}>

          <ScrollView style={styles.conversationsList}>
            {conversations.map(renderConversationItem)}
            
            {conversations.length === 0 && (
              <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>💬</Text>
                <Text style={styles.emptyStateText}>No conversations yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start a conversation by booking a service
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (() => {
        const os = Platform.OS as 'ios' | 'android' | 'web' | 'windows' | 'macos';
        let keyboardBehavior: 'padding' | 'height' | undefined;
        if (os === 'web') {
          keyboardBehavior = undefined;
        } else if (os === 'ios') {
          keyboardBehavior = 'padding';
        } else {
          keyboardBehavior = 'height';
        }
        return (
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={keyboardBehavior}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity 
              onPress={() => {
                setSelectedConversation(null);
                hasHandledInitialConversation.current = false;
              }}
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

          {isSystemConversation() ? (
            <View style={styles.systemInputContainer}>
              <Text style={styles.systemInputText}>
                ℹ️ System notifications are read-only. You cannot reply to these messages.
              </Text>
            </View>
          ) : (
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
          )}
        </KeyboardAvoidingView>
        );
      })()}
          </>
        )}
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F0F2F5' : '#F8F9FA',
    paddingTop: Platform.OS === 'web' ? 20 : 10,
    paddingBottom: Platform.OS === 'web' ? 20 : 10,
    ...(Platform.OS === 'web' ? {
      justifyContent: 'center',
      alignItems: 'center',
    } : {}),
  },
  webContainer: {
    flexDirection: 'row',
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: Platform.OS === 'web' ? 1200 : '100%',
    height: Platform.OS === 'web' ? (screenHeight * 0.85) : '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
    } : {}),
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
    flex: Platform.OS === 'web' ? 0.4 : 1,
    width: Platform.OS === 'web' ? 350 : '100%',
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: Platform.OS === 'web' ? '#E5E7EB' : 'transparent',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'web' ? 0 : 30,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 14 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    } : {}),
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
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyChatArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyChatIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  chatContainer: {
    flex: Platform.OS === 'web' ? 0.6 : 1,
    flexDirection: 'column',
    backgroundColor: '#F9FAFB',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 18 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4a55e1',
    fontWeight: '600',
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
    maxWidth: Platform.OS === 'web' ? '60%' : width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
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
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  attachmentName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingTop: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 20 : 30,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: (Platform.OS as string) === 'web' ? 14 : 12,
    fontSize: (Platform.OS as string) === 'web' ? 15 : 16,
    maxHeight: 120,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...((Platform.OS as string) === 'web' ? {
      outlineWidth: 0,
      outlineStyle: 'none' as any,
      transition: 'border-color 0.2s ease',
    } : {}),
  },
  sendButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 24,
    minWidth: Platform.OS === 'web' ? 80 : undefined,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  sendButtonDisabled: {
    backgroundColor: '#A4B0BE',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  systemInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    backgroundColor: '#FFF3CD',
    borderTopWidth: 1,
    borderTopColor: '#FFC107',
    alignItems: 'center',
  },
  systemInputText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});











