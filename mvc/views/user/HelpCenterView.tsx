import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { AppLayout } from '../../components/layout';

interface HelpCenterViewProps {
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export const HelpCenterView: React.FC<HelpCenterViewProps> = ({ user, onNavigate, onLogout }) => {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqData = [
    {
      id: 1,
      question: 'How do I book an event?',
      answer: 'To book an event, simply browse through the available events, select the one you want, and click the "Book" button. You\'ll be taken through a simple booking process where you can choose your preferred date and time.'
    },
    {
      id: 2,
      question: 'How can I cancel my booking?',
      answer: 'You can cancel your booking by going to the "My Bookings" section, selecting the booking you want to cancel, and clicking the "Cancel" button. Please note that cancellation policies may apply depending on the event.'
    },
    {
      id: 3,
      question: 'How do I contact event organizers?',
      answer: 'You can contact event organizers through the messaging system. Go to the "Messages" section and start a conversation with the organizer of your chosen event.'
    },
    {
      id: 4,
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit cards, debit cards, and digital payment methods including PayPal, Apple Pay, and Google Pay. All payments are processed securely.'
    },
    {
      id: 5,
      question: 'How do I get a refund?',
      answer: 'Refunds are processed according to the event\'s cancellation policy. You can request a refund through the "My Bookings" section or by contacting our support team.'
    },
    {
      id: 6,
      question: 'How do I update my profile information?',
      answer: 'You can update your profile information by going to the "Profile" section and selecting "Personal Information". From there, you can edit your details and save the changes.'
    }
  ];

  const toggleFAQ = (id: number): void => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const renderFAQItem = (faq: any) => (
    <TouchableOpacity
      key={faq.id}
      style={styles.faqItem}
      onPress={() => toggleFAQ(faq.id)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{faq.question}</Text>
        <Text style={styles.faqToggle}>
          {expandedFAQ === faq.id ? '−' : '+'}
        </Text>
      </View>
      {expandedFAQ === faq.id && (
        <Text style={styles.faqAnswer}>{faq.answer}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <AppLayout role="user" activeRoute="settings" title="Help Center" user={user} onNavigate={onNavigate} onLogout={onLogout}>
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {faqData.map(renderFAQItem)}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: Platform.OS === 'web' ? 24 : 20,
    marginBottom: Platform.OS === 'web' ? 32 : 24,
    marginTop: Platform.OS === 'web' ? 24 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 24 : 20,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 3,
    borderBottomColor: '#4a55e1',
    alignSelf: 'flex-start',
    paddingRight: Platform.OS === 'web' ? 24 : 20,
    letterSpacing: Platform.OS === 'web' ? -0.3 : -0.2,
  },
  faqContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
    paddingVertical: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    flex: 1,
    marginRight: 16,
  },
  faqToggle: {
    fontSize: 20,
    color: '#6C63FF',
    fontWeight: 'bold',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginTop: 12,
  },
  bottomSpacing: {
    height: 20,
  },
});











