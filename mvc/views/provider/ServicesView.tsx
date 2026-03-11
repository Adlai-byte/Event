import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { User as UserModel } from '../../models/User';
import { ServicePackage } from '../../models/Package';
import { PackageBuilder } from '../../components/PackageBuilder';
import { AppLayout } from '../../components/layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useServiceForm } from '../../hooks/useServiceForm';
import { useServicesList, ProviderService } from '../../hooks/useServicesList';
import {
  ServiceListTab,
  ServiceFormTab,
  PackagesTab,
  AvailabilityScheduleEditor,
} from '../../components/services';
import { createStyles } from './ServicesView.styles';

interface ProviderServicesProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

const CATEGORIES = ['all', 'venue', 'catering', 'photography', 'music'];

export const ServicesView: React.FC<ProviderServicesProps> = ({ user, onNavigate, onLogout }) => {
  const { screenWidth, isMobile } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit' | 'packages'>('list');
  const [selectedServiceForPackages, setSelectedServiceForPackages] =
    useState<ProviderService | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newlyCreatedServiceId, setNewlyCreatedServiceId] = useState<number | null>(null);

  // Service list + packages state
  const {
    services,
    loading: _loading,
    packages,
    loadingPackages,
    showPackageBuilder,
    setShowPackageBuilder,
    selectedServiceForPackage,
    setSelectedServiceForPackage,
    editingPackage,
    setEditingPackage,
    loadServices,
    loadPackages,
    handleToggleServiceStatus,
    handleDeletePackage,
  } = useServicesList(user);

  // Service form state (add / edit)
  const {
    newService,
    setNewService,
    submitting,
    editingServiceId,
    setEditingServiceId,
    successMessage,
    setSuccessMessage,
    errorMessage,
    setErrorMessage,
    resetForm,
    handleImagePick,
    handleRemoveImage,
    handleSetPrimaryImage,
    handleAddService,
    handleSaveAsDraft,
    handleUpdateService,
    populateForEdit,
  } = useServiceForm(user);

  // Reset form when switching to add mode (and not editing)
  useEffect(() => {
    if (activeTab === 'add' && !editingServiceId) {
      resetForm();
    }
  }, [activeTab, editingServiceId]);

  // ---- Derived data ----
  const filteredServices = services.filter((s: ProviderService) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // ---- Handlers ----
  const handleEditService = (service: ProviderService) => {
    populateForEdit(service);
    setActiveTab('edit');
  };

  const handleManagePackages = (service: ProviderService) => {
    setSelectedServiceForPackages(service);
    setActiveTab('packages');
    loadPackages();
  };

  const handleCreatePackage = (service: ProviderService) => {
    setSelectedServiceForPackage(service);
    setEditingPackage(null);
    setShowPackageBuilder(true);
  };

  const handleEditPackage = (pkg: ServicePackage, service: ProviderService) => {
    setSelectedServiceForPackage(service);
    setEditingPackage(pkg);
    setShowPackageBuilder(true);
  };

  const handlePackageSaved = () => {
    setSuccessMessage(
      editingPackage ? 'Package updated successfully!' : 'Package created successfully!',
    );
    loadPackages();
    setShowPackageBuilder(false);
    setEditingPackage(null);
    setSelectedServiceForPackage(null);
  };

  const onAddTabPress = () => {
    setEditingServiceId(null);
    resetForm();
    setActiveTab('add');
  };

  const onDraftSave = () => {
    handleSaveAsDraft(async () => {
      setActiveTab('list');
      await loadServices();
    });
  };

  const onFormSubmit = () => {
    if (activeTab === 'edit') {
      handleUpdateService(async () => {
        setActiveTab('list');
        await loadServices();
      });
    } else {
      handleAddService(async (newServiceId?: number) => {
        if (newServiceId) {
          setNewlyCreatedServiceId(newServiceId);
        } else {
          setActiveTab('list');
          await loadServices();
        }
      });
    }
  };

  const onFieldChange = (field: string, value: string) => {
    setNewService((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout
      role="provider"
      activeRoute="services"
      title="Services"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
            onPress={() => setActiveTab('list')}
            accessibilityRole="button"
            accessibilityLabel="My services tab"
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'list' && styles.tabButtonTextActive]}
            >
              My Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              (activeTab === 'add' || activeTab === 'edit') && styles.tabButtonActive,
            ]}
            onPress={onAddTabPress}
            accessibilityRole="button"
            accessibilityLabel={activeTab === 'edit' ? 'Cancel edit' : 'Add service'}
          >
            <Text
              style={[
                styles.tabButtonText,
                (activeTab === 'add' || activeTab === 'edit') && styles.tabButtonTextActive,
              ]}
            >
              {activeTab === 'edit' ? 'Cancel Edit' : 'Add Service'}
            </Text>
          </TouchableOpacity>
          {activeTab === 'packages' && selectedServiceForPackages && (
            <TouchableOpacity
              style={[styles.tabButton, styles.tabButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Packages for selected service"
            >
              <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>
                Packages: {selectedServiceForPackages.name}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          {activeTab === 'list' && (
            <ServiceListTab
              services={services}
              filteredServices={filteredServices}
              packages={packages}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterCategory={filterCategory}
              onFilterChange={setFilterCategory}
              categories={CATEGORIES}
              successMessage={successMessage}
              onDismissSuccess={() => setSuccessMessage('')}
              onToggleStatus={handleToggleServiceStatus}
              onEdit={handleEditService}
              onManagePackages={handleManagePackages}
              isMobile={isMobile}
              screenWidth={screenWidth}
            />
          )}

          {(activeTab === 'add' || activeTab === 'edit') && !newlyCreatedServiceId && (
            <ServiceFormTab
              activeTab={activeTab}
              newService={newService}
              onFieldChange={onFieldChange}
              onServiceChange={setNewService}
              submitting={submitting}
              errorMessage={errorMessage}
              onDismissError={() => setErrorMessage('')}
              onImagePick={handleImagePick}
              onRemoveImage={handleRemoveImage}
              onSetPrimaryImage={handleSetPrimaryImage}
              onSubmit={onFormSubmit}
              onSaveAsDraft={onDraftSave}
              categories={CATEGORIES}
              isMobile={isMobile}
              screenWidth={screenWidth}
            />
          )}

          {newlyCreatedServiceId && (
            <AvailabilityScheduleEditor
              serviceId={newlyCreatedServiceId}
              onComplete={() => {
                setNewlyCreatedServiceId(null);
                setActiveTab('list');
                loadServices();
              }}
            />
          )}

          {activeTab === 'packages' && selectedServiceForPackages && (
            <View>
              <TouchableOpacity
                style={styles.backToListButton}
                onPress={() => {
                  setActiveTab('list');
                  setSelectedServiceForPackages(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Back to services list"
              >
                <Feather name="arrow-left" size={16} color="#2563EB" />
                <Text style={styles.backToListText}>Back to Services</Text>
              </TouchableOpacity>
              <PackagesTab
                services={[selectedServiceForPackages]}
                packages={packages}
                loadingPackages={loadingPackages}
                successMessage={successMessage}
                onDismissSuccess={() => setSuccessMessage('')}
                onCreatePackage={handleCreatePackage}
                onEditPackage={handleEditPackage}
                onDeletePackage={(pkg) =>
                  handleDeletePackage(pkg, () => setSuccessMessage('Package deleted successfully'))
                }
                isMobile={isMobile}
                screenWidth={screenWidth}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Package Builder Modal */}
      {selectedServiceForPackage && (
        <PackageBuilder
          visible={showPackageBuilder}
          serviceId={parseInt(selectedServiceForPackage.id)}
          serviceName={selectedServiceForPackage.name}
          packageToEdit={editingPackage}
          onClose={() => {
            setShowPackageBuilder(false);
            setEditingPackage(null);
            setSelectedServiceForPackage(null);
          }}
          onSave={handlePackageSaved}
        />
      )}
    </AppLayout>
  );
};

export default ServicesView;
