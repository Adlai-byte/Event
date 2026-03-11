import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserModel } from '../models/User';
import { apiClient } from '../services/apiClient';
import { getApiBaseUrl } from '../services/api';

/** Shape of the service form data managed by this hook. */
export interface ServiceFormState {
  name: string;
  description: string;
  category: string;
  image: string | null;
  images: Array<{ id?: number; uri: string; isPrimary: boolean }>;
  status: 'draft' | 'active';
  cancellationPolicyId: number | null;
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  description: '',
  category: '',
  image: null,
  images: [],
  status: 'active',
  cancellationPolicyId: null,
};

export function useServiceForm(user?: UserModel) {
  const queryClient = useQueryClient();
  const [newService, setNewService] = useState<ServiceFormState>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage]);

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [errorMessage]);

  // ---- helpers ----

  const resetForm = () => {
    setNewService({ ...EMPTY_FORM });
  };

  const handleImagePick = async () => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.size > 10 * 1024 * 1024) {
              Alert.alert('Error', 'Image size must be less than 10MB');
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              setNewService((prev) => ({
                ...prev,
                images: [
                  ...prev.images,
                  { uri: base64String, isPrimary: prev.images.length === 0 },
                ],
              }));
            };
            reader.onerror = () => {
              Alert.alert('Error', 'Failed to read image file');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need access to your photos to upload a service image. Please enable photo library access in your device settings.',
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
            Alert.alert('Error', 'Image size must be less than 10MB');
            return;
          }
          if (asset.base64) {
            const imageExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpeg';
            const base64String = `data:image/${imageExtension};base64,${asset.base64}`;
            setNewService((prev) => ({
              ...prev,
              images: [...prev.images, { uri: base64String, isPrimary: prev.images.length === 0 }],
            }));
          } else {
            Alert.alert(
              'Warning',
              'Image processing failed. Please try selecting the image again.',
            );
          }
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setNewService((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return { ...prev, images: updated };
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    setNewService((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, isPrimary: i === index })),
    }));
  };

  // --- Mutations ---
  const addServiceMutation = useMutation({
    mutationFn: async (body: any) => {
      return apiClient.post('/api/services', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      return apiClient.put(`/api/services/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  const handleSaveAsDraft = (onSuccess?: () => Promise<void> | void) => {
    setErrorMessage('');

    if (submitting) return;

    if (!newService.name.trim()) {
      setErrorMessage('Service name is required even for drafts');
      return;
    }
    if (!newService.category) {
      setErrorMessage('Please select a category');
      return;
    }
    if (!user?.uid) {
      setErrorMessage('User not authenticated');
      return;
    }

    setSubmitting(true);

    const body: Record<string, any> = {
      providerId: user.uid,
      providerEmail: user.email || null,
      name: newService.name.trim(),
      description: newService.description?.trim() || null,
      category: newService.category,
      basePrice: 0,
      pricingType: 'fixed',
      cancellationPolicyId: newService.cancellationPolicyId || null,
      image: newService.images.length > 0 ? newService.images[0].uri : null,
      status: 'draft',
    };

    addServiceMutation.mutate(body, {
      onSuccess: async () => {
        setSuccessMessage('Draft saved! You can finish editing later.');
        resetForm();
        setSubmitting(false);
        await onSuccess?.();
      },
      onError: (err: any) => {
        setErrorMessage(err?.message || 'Failed to save draft');
        setSubmitting(false);
      },
    });
  };

  const handleAddService = async (onSuccess: (newServiceId?: number) => Promise<void>) => {
    setErrorMessage('');

    if (submitting) return;

    if (!newService.name || !newService.category) {
      setErrorMessage('Please fill in all required fields (Service Name and Category)');
      return;
    }
    if (!user?.uid) {
      setErrorMessage('User not authenticated');
      return;
    }

    setSubmitting(true);

    try {
      const requestBody = {
        providerId: user.uid,
        providerEmail: user.email || null,
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        basePrice: 0,
        pricingType: 'fixed',
        image: newService.images.length > 0 ? newService.images[0].uri : null,
        cancellationPolicyId: newService.cancellationPolicyId,
        status: newService.status,
      };

      const data = await addServiceMutation.mutateAsync(requestBody);

      if (data.ok) {
        // Upload additional images (index 1+) after service creation
        const newServiceId = data.serviceId || data.id;
        if (newServiceId && newService.images.length > 1) {
          for (let i = 1; i < newService.images.length; i++) {
            try {
              await apiClient.post(`/api/services/${newServiceId}/images`, {
                image: newService.images[i].uri,
              });
            } catch (err) {
              console.warn('Failed to upload additional image:', err);
            }
          }
        }

        resetForm();
        setSuccessMessage('Service successfully added!');
        await onSuccess(newServiceId);
      } else {
        setErrorMessage(data.error || 'Failed to add service');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateService = async (onSuccess: () => Promise<void>) => {
    if (!editingServiceId) return;
    if (submitting) return;

    if (!newService.name || !newService.category) {
      setErrorMessage('Please fill in all required fields (Service Name and Category)');
      return;
    }

    setSubmitting(true);

    try {
      const requestBody: any = {
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        cancellationPolicyId: newService.cancellationPolicyId,
        status: newService.status,
      };

      // Use the primary image from the images array
      const primaryImage = newService.images.find((img) => img.isPrimary) || newService.images[0];
      if (primaryImage && primaryImage.uri.startsWith('data:image')) {
        requestBody.image = primaryImage.uri;
      }

      const data = await updateServiceMutation.mutateAsync({
        id: editingServiceId,
        body: requestBody,
      });

      if (data.ok) {
        // Upload any new images (base64 data URIs) beyond the primary
        const newImages = newService.images.filter(
          (img, i) => img.uri.startsWith('data:image') && (i > 0 || !img.isPrimary),
        );
        for (const img of newImages) {
          try {
            await apiClient.post(`/api/services/${editingServiceId}/images`, {
              image: img.uri,
            });
          } catch (err) {
            console.warn('Failed to upload additional image:', err);
          }
        }

        setNewService({ ...EMPTY_FORM });
        setEditingServiceId(null);
        setSuccessMessage('Service updated successfully!');
        await onSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to update service. Please try again.');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Populate the form with an existing service for editing. */
  const populateForEdit = (service: any) => {
    setEditingServiceId(service.id);

    let imageToSet = service.image || null;
    if (imageToSet && typeof imageToSet === 'string') {
      if (
        imageToSet.startsWith('http://') ||
        imageToSet.startsWith('https://') ||
        imageToSet.startsWith('/uploads/')
      ) {
        // keep for display
      } else if (!imageToSet.startsWith('data:image') && imageToSet.length > 50) {
        imageToSet = `data:image/jpeg;base64,${imageToSet}`;
      } else if (imageToSet.length < 50 && !imageToSet.startsWith('http')) {
        imageToSet = null;
      }
    }

    const apiUrl = getApiBaseUrl();
    const editImages: Array<{ id?: number; uri: string; isPrimary: boolean }> = imageToSet
      ? [
          {
            uri: imageToSet.startsWith('http') ? imageToSet : `${apiUrl}${imageToSet}`,
            isPrimary: true,
          },
        ]
      : [];

    setNewService({
      name: service.name,
      description: service.description || '',
      category: service.category,
      image: imageToSet,
      images: editImages,
      status: service.status || 'active',
      cancellationPolicyId: service.cancellationPolicyId ?? null,
    });
  };

  return {
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
  };
}
