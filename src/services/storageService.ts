import { storage, isFirebaseConfigured } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export interface UploadEvidenceOptions {
  developerCompanyId: string;
  clientCompanyId: string;
  projectId: string;
  reportId: string;
  itemId: string;
  type: 'original' | 'annotated' | 'attachment';
  dataUrlOrBase64: string;
  mimeType?: string;
}

export interface UploadResult {
  url: string;
  storagePath: string;
  isCloudStorage: boolean;
  sizeBytes: number;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const storageService = {
  /**
   * Upload an evidence image (original or annotated) to Cloud Storage
   * with multi-tenant directory isolation.
   */
  async uploadIncidentImage(options: UploadEvidenceOptions): Promise<UploadResult> {
    const {
      developerCompanyId,
      clientCompanyId,
      projectId,
      reportId,
      itemId,
      type,
      dataUrlOrBase64,
      mimeType = 'image/png',
    } = options;

    // Estimate size from Base64 string
    const stringLength = dataUrlOrBase64.length - (dataUrlOrBase64.indexOf(',') + 1);
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383687;

    if (sizeInBytes > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('La imagen excede el tamaño máximo permitido de 10 MB.');
    }

    const storagePath = `tenants/${developerCompanyId}/clients/${clientCompanyId}/projects/${projectId}/incidents/${reportId}/${itemId}_${type}.png`;

    if (isFirebaseConfigured() && storage) {
      try {
        const storageRef = ref(storage, storagePath);
        // Upload base64 data URL
        await uploadString(storageRef, dataUrlOrBase64, 'data_url', {
          contentType: mimeType,
          customMetadata: {
            developerCompanyId,
            clientCompanyId,
            projectId,
            reportId,
            itemId,
            evidenceType: type,
          },
        });
        const downloadUrl = await getDownloadURL(storageRef);

        return {
          url: downloadUrl,
          storagePath,
          isCloudStorage: true,
          sizeBytes: Math.round(sizeInBytes),
        };
      } catch (cloudStorageErr) {
        console.warn(
          '[StorageService] Cloud Storage bucket no disponible o en proceso de activación. Utilizando almacenamiento local de alta fidelidad:',
          cloudStorageErr
        );
      }
    }

    // High fidelity fallback using Base64 Data URL
    return {
      url: dataUrlOrBase64,
      storagePath,
      isCloudStorage: false,
      sizeBytes: Math.round(sizeInBytes),
    };
  },
};
