import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface HelpCenterViewProps {
  onBack: () => void;
}

export const HelpCenterView: React.FC<HelpCenterViewProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
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

  const helpCategories = [
    {
      icon: '📅',
      title: 'Booking & Events',
      description: 'Learn about booking events and managing your reservations',
      articles: 12
    },
    {
      icon: '💳',
      title: 'Payments & Billing',
      description: 'Information about payments, refunds, and billing',
      articles: 8
    },
    {
      icon: '📱',
      title: 'Account & Profile',
      description: 'Manage your account settings and profile information',
      articles: 6
    },
    {
      icon: '🔧',
      title: 'Technical Support',
      description: 'Troubleshooting and technical assistance',
      articles: 10
    }
  ];

  const contactOptions = [
    {
      icon: '📞',
      title: 'Call Support',
      description: 'Speak with our support team',
      action: 'Call Now'
    },
    {
      icon: '💬',
      title: 'Live Chat',
      description: 'Chat with us in real-time',
      action: 'Start Chat'
    },
    {
      icon: '📧',
      title: 'Email Support',
      description: 'Send us an email',
      action: 'Send Email'
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

  const renderCategoryCard = (category: any) => (
    <TouchableOpacity key={category.title} style={styles.categoryCard}>
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{category.title}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>
        <Text style={styles.categoryArticles}>{category.articles} articles</Text>
      </View>
      <Text style={styles.categoryArrow}>›</Text>
    </TouchableOpacity>
  );

  const renderContactOption = (option: any) => (
    <TouchableOpacity key={option.title} style={styles.contactOption}>
      <Text style={styles.contactIcon}>{option.icon}</Text>
      <View style={styles.contactContent}>
        <Text style={styles.contactTitle}>{option.title}</Text>
        <Text style={styles.contactDescription}>{option.description}</Text>
      </View>
      <TouchableOpacity style={styles.contactAction}>
        <Text style={styles.contactActionText}>{option.action}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Background Design */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundGradient} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.searchTitle}>How can we help you?</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help articles..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#A4B0BE"
            />
            <TouchableOpacity style={styles.searchButton}>
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Help Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.categoriesGrid}>
            {helpCategories.map(renderCategoryCard)}
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactContainer}>
            {contactOptions.map(renderContactOption)}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {faqData.map(renderFAQItem)}
          </View>
        </View>

        {/* Additional Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          <View style={styles.resourcesContainer}>
            <TouchableOpacity style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>📖</Text>
              <Text style={styles.resourceTitle}>User Guide</Text>
              <Text style={styles.resourceDescription}>Complete guide to using the app</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>🎥</Text>
              <Text style={styles.resourceTitle}>Video Tutorials</Text>
              <Text style={styles.resourceDescription}>Step-by-step video guides</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>📋</Text>
              <Text style={styles.resourceTitle}>Terms of Service</Text>
              <Text style={styles.resourceDescription}>Read our terms and conditions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 10,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    top: -50,
    right: -50,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    bottom: 200,
    left: -30,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 24,
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
  searchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
  },
  searchButton: {
    padding: 8,
  },
  searchIcon: {
    fontSize: 20,
    color: '#6C63FF',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (screenWidth - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 4,
  },
  categoryArticles: {
    fontSize: 10,
    color: '#6C63FF',
    fontWeight: '500',
  },
  categoryArrow: {
    fontSize: 16,
    color: '#A4B0BE',
    fontWeight: 'bold',
  },
  contactContainer: {
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
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#636E72',
  },
  contactAction: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
  resourcesContainer: {
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
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  resourceIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
    flex: 1,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#636E72',
    flex: 1,
  },
  bottomSpacing: {
    height: 20,
  },
});











