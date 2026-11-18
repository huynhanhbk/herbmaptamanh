import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { MedicinalPlant, getConservationStatusLabel, getPlantSurveyStatus } from '../types';
import { getStoredPlants, savePlants, deduplicatePlants } from '../utils/storage';

const COLLECTION_NAME = 'plants';
const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80';

function sanitizeDocumentId(rawId: string): string {
  return (rawId || 'TA-HERB-UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function clampImageString(val: unknown): string {
  const s = typeof val === 'string' && val.trim() ? val.trim() : DEFAULT_FALLBACK_IMAGE;
  return s.length > 440000 ? DEFAULT_FALLBACK_IMAGE : s;
}

function removeUndefinedDeep<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedDeep(item)) as unknown as T;
  }
  if (obj && typeof obj === 'object' && !(obj instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        out[k] = removeUndefinedDeep(v);
      }
    });
    return out as T;
  }
  return obj;
}

function normalizeFirestoreDateValue(val: unknown, fallbackIso: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val === 'object' && typeof (val as any).toDate === 'function') {
    return (val as any).toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) {
    return val;
  }
  return fallbackIso;
}

function hydratePlantFromSnapshot(docId: string, raw: Record<string, any>): MedicinalPlant {
  const nowIso = new Date().toISOString();
  return {
    ...(raw as MedicinalPlant),
    id: raw.id || docId,
    createdAt: normalizeFirestoreDateValue(raw.createdAt, nowIso),
    updatedAt: normalizeFirestoreDateValue(raw.updatedAt, nowIso),
  };
}

function buildFirestorePlantPayload(plant: MedicinalPlant): Record<string, unknown> {
  const statusMeta = getPlantSurveyStatus(plant);
  const normalizedConservationStatus = getConservationStatusLabel(
    plant.conservationStatus,
    plant.isDisappeared,
    plant.occurrenceStatus
  );

  const sanitizedPhotos = (Array.isArray(plant.photos) ? plant.photos : [])
    .slice(0, 20)
    .map((ph, idx) => ({
      id: clampString(ph?.id, 128, `photo-${idx}`),
      url: clampImageString(ph?.url),
      caption: clampString(ph?.caption, 300, plant.vietnameseName || 'Mẫu thực địa'),
      type: ['whole', 'leaf', 'flower', 'fruit', 'root'].includes(ph?.type) ? ph.type : 'whole',
    }));

  const sanitizedLogs = (Array.isArray(plant.monitoringLogs) ? plant.monitoringLogs : [])
    .slice(0, 100)
    .map((log, idx) => {
      const cleanedLog: Record<string, unknown> = {
        id: clampString(log?.id, 128, `log-${idx}`),
        date: clampString(log?.date, 32, new Date().toISOString().split('T')[0]),
        status: ['present', 'disappeared', 'new', 'safe', 'degraded'].includes(log?.status)
          ? log.status
          : 'present',
        conservationStatus: getConservationStatusLabel(
          log?.conservationStatus,
          log?.status === 'disappeared',
          log?.status
        ),
        statusNote: clampString(log?.statusNote, 2000, 'Ghi nhận thực địa'),
        surveyor: clampString(log?.surveyor, 200, 'Nhóm khảo sát thực địa Tam Anh'),
        createdAt: clampString(log?.createdAt, 64, new Date().toISOString()),
        approvalStatus: log?.approvalStatus || 'approved',
        submittedByRole: log?.submittedByRole || 'admin',
      };
      if (log?.contactPhone) cleanedLog.contactPhone = clampString(log.contactPhone, 50);
      if (log?.evidencePhoto && log.evidencePhoto.length <= 440000) {
        cleanedLog.evidencePhoto = log.evidencePhoto;
      }
      if (log?.reviewedBy) cleanedLog.reviewedBy = clampString(log.reviewedBy, 200);
      if (log?.reviewedAt) cleanedLog.reviewedAt = clampString(log.reviewedAt, 64);
      if (log?.rejectionReason) cleanedLog.rejectionReason = clampString(log.rejectionReason, 500);
      return cleanedLog;
    });

  const cleanOtherNames = Array.isArray(plant.otherNames)
    ? plant.otherNames.map((s) => clampString(s, 100)).filter(Boolean).slice(0, 20)
    : [];

  const cleanTraits: Record<string, string> = {
    growthForm: clampString(plant.identificationTraits?.growthForm, 1000, 'Cây thảo / cây bụi tự nhiên.'),
    leaves: clampString(plant.identificationTraits?.leaves, 1000, 'Đang cập nhật tiêu bản lá.'),
    flowers: clampString(plant.identificationTraits?.flowers, 1000, 'Đang cập nhật thông tin hoa/quả.'),
  };
  if (plant.identificationTraits?.fruits) {
    cleanTraits.fruits = clampString(plant.identificationTraits.fruits, 1000);
  }
  if (plant.identificationTraits?.roots) {
    cleanTraits.roots = clampString(plant.identificationTraits.roots, 1000);
  }

  const cleanLocation: Record<string, unknown> = {
    lat: typeof plant.location?.lat === 'number' && !isNaN(plant.location.lat) ? plant.location.lat : 15.4635,
    lng: typeof plant.location?.lng === 'number' && !isNaN(plant.location.lng) ? plant.location.lng : 108.6185,
    addressDescription: clampString(plant.location?.addressDescription, 500, 'Xã Tam Anh'),
    communeSection: clampString(plant.location?.communeSection, 150, 'Thôn Đức Bố'),
  };
  if (
    typeof plant.location?.elevationMeters === 'number' &&
    !isNaN(plant.location.elevationMeters)
  ) {
    cleanLocation.elevationMeters = plant.location.elevationMeters;
  }

  const cleanDataSource: Record<string, string> = {
    type: ['research_heritage', 'field_survey_2026', 'community_contribution'].includes(plant.dataSource?.type)
      ? plant.dataSource.type
      : 'field_survey_2026',
    title: clampString(plant.dataSource?.title, 300, 'Khảo sát thực địa cây thuốc Tam Anh 2026'),
    surveyor: clampString(plant.dataSource?.surveyor, 200, 'Nhóm khảo sát thực địa Tam Anh'),
    surveyDate: clampString(plant.dataSource?.surveyDate, 32, new Date().toISOString().split('T')[0]),
  };
  if (plant.dataSource?.surveyorAddress) {
    cleanDataSource.surveyorAddress = clampString(plant.dataSource.surveyorAddress, 300);
  }
  if (plant.dataSource?.surveyorPhone) {
    cleanDataSource.surveyorPhone = clampString(plant.dataSource.surveyorPhone, 50);
  }
  if (plant.dataSource?.verifiedBy) {
    cleanDataSource.verifiedBy = clampString(plant.dataSource.verifiedBy, 200);
  }
  if (plant.dataSource?.notes) {
    cleanDataSource.notes = clampString(plant.dataSource.notes, 1000);
  }

  const cleanUses = {
    folkRemedies: (Array.isArray(plant.traditionalUses?.folkRemedies)
      ? plant.traditionalUses.folkRemedies.map((s) => clampString(s, 500)).filter(Boolean)
      : ['Tư liệu dân gian đang được thẩm định.']
    ).slice(0, 30),
    partUsed: (Array.isArray(plant.traditionalUses?.partUsed)
      ? plant.traditionalUses.partUsed.map((s) => clampString(s, 100)).filter(Boolean)
      : ['Toàn cây']
    ).slice(0, 20),
    preparation: clampString(plant.traditionalUses?.preparation, 2000, 'Rửa sạch sắc nước uống.'),
    informantName: clampString(plant.traditionalUses?.informantName, 200, 'Nhân dân xã Tam Anh'),
    informantRole: clampString(plant.traditionalUses?.informantRole, 200, 'Người am hiểu cây thuốc'),
    hasConsent: Boolean(plant.traditionalUses?.hasConsent ?? true),
  };

  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: sanitizeDocumentId(plant.id),
    vietnameseName: clampString(plant.vietnameseName, 200, 'Cây thuốc chưa đặt tên'),
    otherNames: cleanOtherNames,
    scientificName: clampString(plant.scientificName, 250, 'Đang xác minh phân loại học'),
    family: clampString(plant.family, 200, 'Chưa phân loại'),
    coverImage: clampImageString(plant.coverImage),
    photos: sanitizedPhotos,
    shortDescription: clampString(plant.shortDescription, 2000, ''),
    identificationTraits: cleanTraits,
    habitat: clampString(plant.habitat, 500, 'Vườn nhà & nương đồi'),
    habitatCategory: ['natural_forest', 'planted_forest', 'shrub_grassland', 'sea', 'garden', 'farmland'].includes(
      plant.habitatCategory
    )
      ? plant.habitatCategory
      : 'garden',
    location: cleanLocation,
    conservationStatus: normalizedConservationStatus,
    conservationLevel: ['safe', 'vulnerable', 'endangered'].includes(plant.conservationLevel)
      ? plant.conservationLevel
      : 'safe',
    occurrenceStatus:
      plant.occurrenceStatus ||
      (statusMeta.key === 'disappeared' ? 'disappeared' : statusMeta.key === 'new' ? 'new' : 'present'),
    isDisappeared: Boolean(plant.isDisappeared || statusMeta.key === 'disappeared'),
    traditionalUses: cleanUses,
    dataSource: cleanDataSource,
    status: plant.status === 'pending' ? 'pending' : 'verified',
    surveyFrequencyCount:
      typeof plant.surveyFrequencyCount === 'number' && !isNaN(plant.surveyFrequencyCount)
        ? Math.max(0, Math.min(100000, plant.surveyFrequencyCount))
        : 1,
    monitoringLogs: sanitizedLogs,
    createdAt: clampString(plant.createdAt, 64, nowIso) || nowIso,
    updatedAt: clampString(plant.updatedAt, 64, nowIso) || nowIso,
  };

  if (plant.genus) payload.genus = clampString(plant.genus, 200);
  if (plant.species) payload.species = clampString(plant.species, 200);
  if (plant.trendStatus && ['stable', 'declining', 'increasing'].includes(plant.trendStatus)) {
    payload.trendStatus = plant.trendStatus;
  }

  return removeUndefinedDeep(payload);
}

/**
 * Seeds initial plants to Firestore if the collection is empty.
 */
export async function syncInitialPlantsToFirestore(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where('status', 'in', ['verified', 'pending']));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const localPlants = getStoredPlants();
      await batchSavePlantsToFirestore(localPlants);
    }
  } catch (err) {
    console.warn('Firestore initial sync error:', err);
  }
}

/**
 * Saves or updates a single plant in Firestore.
 */
export async function savePlantToFirestore(plant: MedicinalPlant): Promise<void> {
  if (!plant || !plant.id) return;
  try {
    const safeId = sanitizeDocumentId(plant.id);
    const docRef = doc(db, COLLECTION_NAME, safeId);
    const payload = buildFirestorePlantPayload({ ...plant, id: safeId });
    await setDoc(docRef, payload);
  } catch (err) {
    console.error('Error saving plant to Firestore:', err);
  }
}

/**
 * Deletes a plant document from Firestore.
 */
export async function deletePlantFromFirestore(plantId: string): Promise<void> {
  if (!plantId) return;
  try {
    const safeId = sanitizeDocumentId(plantId);
    await deleteDoc(doc(db, COLLECTION_NAME, safeId));
  } catch (err) {
    console.error('Error deleting plant from Firestore:', err);
  }
}

/**
 * Batch saves a list of plants to Firestore (chunked safely under 500-op batch limit).
 */
export async function batchSavePlantsToFirestore(plants: MedicinalPlant[]): Promise<void> {
  try {
    const chunkSize = 400;
    for (let i = 0; i < plants.length; i += chunkSize) {
      const chunk = plants.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((plant) => {
        if (!plant?.id) return;
        const safeId = sanitizeDocumentId(plant.id);
        const docRef = doc(db, COLLECTION_NAME, safeId);
        const payload = buildFirestorePlantPayload({ ...plant, id: safeId });
        batch.set(docRef, payload);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error batch saving plants to Firestore:', err);
  }
}

/**
 * Subscribes to real-time updates from Firestore across all devices.
 */
export function subscribeToPlantsRealtime(
  callback: (plants: MedicinalPlant[]) => void
): () => void {
  const colRef = collection(db, COLLECTION_NAME);
  const plantsQuery = query(colRef, where('status', 'in', ['verified', 'pending']));

  return onSnapshot(
    plantsQuery,
    (snapshot) => {
      if (snapshot.empty) {
        callback(getStoredPlants());
        return;
      }
      const cloudPlants: MedicinalPlant[] = [];
      snapshot.forEach((docSnap) => {
        cloudPlants.push(hydratePlantFromSnapshot(docSnap.id, docSnap.data()));
      });
      const deduplicated = deduplicatePlants(cloudPlants);
      savePlants(deduplicated);
      callback(deduplicated);
    },
    (err) => {
      console.warn('Firestore realtime subscription warning:', err);
      callback(getStoredPlants());
    }
  );
}
