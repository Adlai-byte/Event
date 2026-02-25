import React from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import { formatPrice } from '../../utils/serviceHelpers';

interface Service {
  idservice: number;
  s_name: string;
  s_description: string;
  s_category: string;
  s_base_price: number | null;
  s_rating: number | null;
  s_review_count: number | null;
  primary_image?: string | null;
  provider_name?: string;
}

export interface ServiceShowcaseProps {
  styles: any;
  trendingServices: Service[];
  entertainmentServices: Service[];
  newsletterEmail: string;
  newsletterEmailError: string | null;
  onServiceClick: (serviceId: number) => void;
  onRegister: () => void;
  onNewsletterEmailChange: (text: string) => void;
  onNewsletterSubscribe: () => void;
  validateEmail: (email: string) => string | null;
  onNewsletterEmailErrorChange: (error: string | null) => void;
}

export const ServiceShowcase: React.FC<ServiceShowcaseProps> = ({
  styles,
  trendingServices,
  entertainmentServices,
  newsletterEmail,
  newsletterEmailError,
  onServiceClick,
  onRegister,
  onNewsletterEmailChange,
  onNewsletterSubscribe,
  validateEmail,
  onNewsletterEmailErrorChange,
}) => {
  return (
    <>
      {/* Main Content with Sidebar */}
      <View style={styles.contentWithSidebar}>
        {/* Main Content Area */}
        <View style={styles.mainContentArea}>
          {/* Recommended Products Section */}
          <View style={styles.recommendedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.recommendedTitle}>Recommended Services</Text>
              <Text style={styles.recommendedSubtitle}>
                Discover our handpicked selection of premium event services
              </Text>
            </View>

            {trendingServices.length > 0 ? (
              <View style={styles.servicesGrid}>
                {trendingServices.slice(0, 6).map((service) => (
                  <TouchableOpacity
                    key={service.idservice}
                    style={styles.serviceCard}
                    onPress={() => onServiceClick(service.idservice)}
                  >
                    {service.primary_image ? (
                      <Image
                        source={{ uri: service.primary_image }}
                        style={styles.serviceCardImage as any}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.serviceCardImagePlaceholder}>
                        <Text style={styles.serviceCardImageText}>
                          {service.s_name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.serviceCardContent}>
                      <Text style={styles.serviceCardPrice}>
                        {formatPrice(service.s_base_price || 0)}
                      </Text>
                      <Text style={styles.serviceCardTitle} numberOfLines={2}>
                        {service.s_name}
                      </Text>
                      <Text style={styles.serviceCardBrand}>
                        {service.provider_name || 'Premium Provider'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No services available</Text>
            )}
          </View>
        </View>

        {/* Right Sidebar */}
        <View style={styles.sidebar}>
          {/* Promotional Image */}
          <View style={styles.sidebarPromoImage}>
            {trendingServices.length > 0 && trendingServices[0]?.primary_image ? (
              <Image
                source={{ uri: trendingServices[0].primary_image }}
                style={styles.sidebarImage as any}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.sidebarImagePlaceholder}>
                <Text style={styles.sidebarImageText}>Event Setup</Text>
              </View>
            )}
          </View>

          {/* Promotional Section */}
          <View style={styles.sidebarPromo}>
            <Text style={styles.sidebarPromoTitle}>Premium Event Services</Text>
            <Text style={styles.sidebarPromoText}>
              Discover our curated selection of professional event services. From venues to catering, we have everything you need for your special occasion.
            </Text>
            <TouchableOpacity style={styles.sidebarPromoButton} onPress={onRegister}>
              <Text style={styles.sidebarPromoButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>

          {/* Service Features */}
          <View style={styles.sidebarFeatures}>
            <View style={styles.sidebarFeature}>
              <Text style={styles.sidebarFeatureIcon}>{'\uD83D\uDEE0\uFE0F'}</Text>
              <View style={styles.sidebarFeatureContent}>
                <Text style={styles.sidebarFeatureTitle}>24/7 Support</Text>
                <Text style={styles.sidebarFeatureText}>
                  Our team is available around the clock to assist you with your event planning needs.
                </Text>
              </View>
            </View>
            <View style={styles.sidebarFeature}>
              <Text style={styles.sidebarFeatureIcon}>{'\uD83D\uDEE1\uFE0F'}</Text>
              <View style={styles.sidebarFeatureContent}>
                <Text style={styles.sidebarFeatureTitle}>Best Price Guarantee</Text>
                <Text style={styles.sidebarFeatureText}>
                  We guarantee the best prices for all our services. Find a better price? We'll match it.
                </Text>
              </View>
            </View>
          </View>

          {/* Newsletter Section */}
          <View style={styles.sidebarNewsletter}>
            <Text style={styles.sidebarNewsletterTitle}>Get -20% on Your First Booking</Text>
            <Text style={styles.sidebarNewsletterSubtitle}>
              Subscribe to our newsletter and receive exclusive discounts
            </Text>
            <View style={styles.sidebarNewsletterForm}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.sidebarNewsletterInput, newsletterEmailError && { borderColor: '#ef4444', borderWidth: 1 }]}
                  placeholder="Your email address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={newsletterEmail}
                  onChangeText={(text) => {
                    onNewsletterEmailChange(text);
                    const error = validateEmail(text);
                    onNewsletterEmailErrorChange(error);
                  }}
                />
                {newsletterEmailError && (
                  <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4, marginLeft: 4 }}>
                    {newsletterEmailError}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.sidebarNewsletterButton} onPress={onNewsletterSubscribe}>
                <Text style={styles.sidebarNewsletterButtonText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Entertainment Section */}
      <View style={styles.entertainmentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Entertainment & News</Text>
        </View>
        {entertainmentServices.length > 0 ? (
          <View style={styles.articlesGrid}>
            {entertainmentServices.map((service) => (
              <TouchableOpacity
                key={service.idservice}
                style={styles.articleCard}
                onPress={() => onServiceClick(service.idservice)}
              >
                {service.primary_image ? (
                  <Image
                    source={{ uri: service.primary_image }}
                    style={styles.articleImage as any}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.articleImagePlaceholder}>
                    <Text style={styles.articleImageText}>
                      {service.s_category.charAt(0).toUpperCase() + service.s_category.slice(1)}
                    </Text>
                  </View>
                )}
                <View style={styles.articleCardContent}>
                  <Text style={styles.articleCardTitle} numberOfLines={2}>{service.s_name}</Text>
                  <View style={styles.articleCardMeta}>
                    <Text style={styles.articleCardPrice}>
                      {formatPrice(service.s_base_price || 0)}
                    </Text>
                    {service.s_rating &&
                     typeof service.s_rating === 'number' &&
                     service.s_rating > 0 && (
                      <Text style={styles.articleCardRating}>
                        {'\u2B50'} {Number(service.s_rating).toFixed(1)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No services available</Text>
        )}
      </View>

    </>
  );
};
