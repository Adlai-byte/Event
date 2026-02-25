import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { getApiBaseUrl } from '../../services/api';
import { styles } from '../../views/user/BookingView.styles';
import type { Booking } from './types';

export interface EventDetailsModalProps {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onPay?: () => void;
  onMessageProvider?: (bookingId: string) => void;
  userEmail?: string;
  serviceRatings?: Record<number, { rating: number; comment: string | null }>;
  onRateService?: (serviceId: number, serviceName: string) => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  booking,
  onClose,
  onEdit,
  onCancel,
  onPay,
  onMessageProvider,
  userEmail,
  serviceRatings = {},
  onRateService,
}) => {
  const [imageError, setImageError] = useState(false);

  // Check if booking is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(booking.dateStr || booking.date);
  eventDate.setHours(0, 0, 0, 0);
  const isPast = eventDate < today;

  // Show pay button only if confirmed, not paid, and not in the past
  const showPayButton = booking.bookingStatus === 'confirmed' && !booking.isPaid && !isPast;

  const handleDownloadInvoice = async () => {
    if (!userEmail) {
      Alert.alert('Error', 'User email is required');
      return;
    }

    try {
      const invoiceUrl = `${getApiBaseUrl()}/api/user/bookings/${booking.id}/invoice?userEmail=${encodeURIComponent(userEmail)}`;

      if (Platform.OS === 'web') {
        // For web, open in new tab to download
        if (typeof window !== 'undefined') {
          window.open(invoiceUrl, '_blank');
        }
      } else {
        // For mobile, use Linking
        Linking.openURL(invoiceUrl).catch((err) => {
          console.error('Error opening invoice URL:', err);
          Alert.alert('Error', 'Failed to download invoice. Please try again.');
        });
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Error', `Failed to download invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const isWeb = Platform.OS === 'web';

  // Shared content renderer to avoid duplication between web and mobile
  const renderContent = () => (
    <>
      {/* Header */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>{'\u2715'}</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Event Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.modalContent}
        contentContainerStyle={styles.modalContentContainer}
      >
        {/* Event Image */}
        <View style={styles.eventImageContainer}>
          {booking.image && !imageError ? (
            <Image
              source={{ uri: booking.image }}
              style={styles.eventImage as any}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>X</Text>
            </View>
          )}
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{booking.title}</Text>
          <Text style={styles.eventDateTime}>
            {booking.date} - {booking.time}
          </Text>
          <Text style={styles.eventLocation}>{booking.location}</Text>

          <Text style={styles.eventDescription}>{booking.description}</Text>

          {/* Total Cost */}
          <View style={styles.costSection}>
            <Text style={styles.costLabel}>Total Cost:</Text>
            <View style={styles.costValueContainer}>
              <Text style={styles.costValue}>{'\u20B1'}{booking.totalCost.toLocaleString()}</Text>
              {booking.bookingStatus === 'cancelled' && (
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                </View>
              )}
              {booking.isPaid && booking.bookingStatus !== 'cancelled' && (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>PAID</Text>
                </View>
              )}
              {!isWeb && booking.bookingStatus === 'completed' && !booking.isPaid && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>COMPLETED</Text>
                </View>
              )}
            </View>
          </View>

          {/* Services Details */}
          {booking.services && booking.services.length > 0 && (
            <View style={styles.servicesSection}>
              <Text style={styles.servicesTitle}>Services</Text>
              {booking.services.map((service, index) => {
                const serviceId = service.serviceId;
                const existingRating = serviceId ? serviceRatings[serviceId] : null;
                const isCompleted = booking.bookingStatus === 'completed';

                return (
                  <View key={index} style={styles.serviceDetailCard}>
                    <View style={styles.serviceDetailHeader}>
                      <Text style={styles.serviceDetailName}>{service.name}</Text>
                      {existingRating && (
                        <View style={styles.ratingBadge}>
                          <Text style={styles.ratingBadgeText}>{'\u2605'} {existingRating.rating}/5</Text>
                        </View>
                      )}
                    </View>
                    {service.description && (
                      <Text style={styles.serviceDetailDescription}>{service.description}</Text>
                    )}
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>Quantity:</Text>
                      <Text style={styles.serviceDetailValue}>{service.quantity}</Text>
                    </View>
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>Unit Price:</Text>
                      <Text style={styles.serviceDetailValue}>{'\u20B1'}{service.unitPrice.toLocaleString()}</Text>
                    </View>
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>Subtotal:</Text>
                      <Text style={styles.serviceDetailValue}>{'\u20B1'}{service.totalPrice.toLocaleString()}</Text>
                    </View>
                    {existingRating && existingRating.comment && (
                      <View style={styles.ratingCommentBox}>
                        <Text style={styles.ratingCommentLabel}>Your Review:</Text>
                        <Text style={styles.ratingCommentText}>{existingRating.comment}</Text>
                      </View>
                    )}
                    {isCompleted && serviceId && onRateService && !existingRating && (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => onRateService(serviceId, service.name)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rateButtonIcon}>{'\u2B50'}</Text>
                        <Text style={styles.rateButtonText}>Rate Service</Text>
                      </TouchableOpacity>
                    )}
                    {isCompleted && existingRating && (
                      <View style={styles.ratedBadge}>
                        <Text style={styles.ratedBadgeText}>{'\u2713'} Rating Submitted</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Suppliers */}
          <View style={styles.suppliersSection}>
            <Text style={styles.suppliersTitle}>Suppliers</Text>
            {booking.suppliers.map((supplier, index) => (
              <View key={index} style={styles.supplierItem}>
                <View style={styles.supplierImage}>
                  <Text style={styles.placeholderText}>X</Text>
                </View>
                <Text style={styles.supplierName}>{supplier}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.modalActions}>
        {showPayButton && (
          <TouchableOpacity style={styles.payButtonModal} onPress={onPay} activeOpacity={0.8}>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>{'\uD83D\uDCB3'}</Text>
              <Text style={styles.payButtonModalText}>Pay Now</Text>
            </View>
          </TouchableOpacity>
        )}
        {booking.isPaid && (
          <TouchableOpacity
            style={[styles.invoiceButton, showPayButton && styles.invoiceButtonWithPay]}
            onPress={handleDownloadInvoice}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>{'\uD83D\uDCC4'}</Text>
              <Text style={styles.invoiceButtonText}>Invoice</Text>
            </View>
          </TouchableOpacity>
        )}
        {booking.bookingStatus === 'confirmed' && onMessageProvider && (
          <TouchableOpacity
            style={[styles.messageButton, (showPayButton || booking.isPaid) && styles.messageButtonWithPay]}
            onPress={() => onMessageProvider(booking.id)}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>{'\uD83D\uDCAC'}</Text>
              <Text style={styles.messageButtonText}>Message</Text>
            </View>
          </TouchableOpacity>
        )}
        {!booking.isPaid && !isPast && booking.bookingStatus !== 'completed' && booking.bookingStatus !== 'cancelled' && (
          <>
            <TouchableOpacity
              style={[styles.editButton, (showPayButton || booking.bookingStatus === 'confirmed') && styles.editButtonWithOther]}
              onPress={onEdit}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>{'\u270F\uFE0F'}</Text>
                <Text style={styles.editButtonText}>Edit</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>{'\u274C'}</Text>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.modalContainer}>
      {isWeb ? (
        <View style={styles.modalWebCardContainer}>
          {renderContent()}
        </View>
      ) : (
        renderContent()
      )}
    </View>
  );
};
