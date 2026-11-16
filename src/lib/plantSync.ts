import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth } from './firebase';
import { MedicinalPlant, PlantMonitoringLog, PlantPhoto } from '../types';
import { getStoredPlants, savePlants, deduplicatePlants } from '../utils/storage';
import { INITIAL_PLANTS_DATA } from '../data/plants';
import { compressBase64Image } from '../utils/imageCompressor';

const COLLECTION_NAME = 'plants';
const SURVEYS_COLLECTION = 'surveys';
const ADMINS_COLLECTION = 'admins';
export const ADMIN_EMAILS = [
  'huynhanhbk.92@gmail.com',
  'lenhu101293@gmail.com',
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface PendingCommunitySurvey extends PlantMonitoringLog {
  plantId: string;
  plantName?: string;
  plantScientificName?: string;
}

/**
 * Checks whether a Firebase Auth user is an authorized & verified Admin.
 */
export async function checkUserIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  const userEmail = user.email?.trim().toLowerCase();
  if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
    return true;
  }
  try {
    const adminDocRef = doc(db, ADMINS_COLLECTION, user.uid);
    const adminSnap = await getDoc(adminDocRef);
    return adminSnap.exists() && adminSnap.data()?.active !== false;
  } catch (err) {
    console.warn('Admin role verification check failed:', err);
    return false;
  }
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80';

function clampStr(val: unknown, maxBytes: number, fallback: string = ''): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    if (encoder.encode(trimmed).length <= maxBytes) return trimmed;
    let low = 0;
    let high = trimmed.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (encoder.encode(trimmed.slice(0, mid)).length <= maxBytes) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return trimmed.slice(0, low);
  }
  return trimmed.length > maxBytes ? trimmed.slice(0, maxBytes) : trimmed;
}

/**
 * Strips any unknown/null keys and enforces firestore.rules schema & size boundaries
 * so valid writes are never accidentally rejected by `hasOnly` or type/size guards.
 */
export function sanitizePlantForFirestore(plant: MedicinalPlant): MedicinalPlant {
  const safeId = clampStr(plant.id, 128).replace(/[^a-zA-Z0-9_\-]/g, '-');
  const latNum = Number(plant.location?.lat);
  const lngNum = Number(plant.location?.lng);
  const safeLat = Number.isFinite(latNum) && latNum >= -90 && latNum <= 90 ? latNum : 15.4848;
  const safeLng = Number.isFinite(lngNum) && lngNum >= -180 && lngNum <= 180 ? lngNum : 108.584;

  const safeStatus: 'verified' | 'pending' = plant.status === 'pending' ? 'pending' : 'verified';
  const safeOccurrenceStatus =
    plant.isDisappeared || plant.occurrenceStatus === 'disappeared' || plant.conservationStatus === 'Biến mất'
      ? 'disappeared'
      : safeStatus === 'pending' || plant.occurrenceStatus === 'new' || plant.conservationStatus === 'Điểm mới (Chờ duyệt)'
      ? 'new'
      : 'present';
  const safeIsDisappeared = safeOccurrenceStatus === 'disappeared';
  const safeConservationStatus =
    safeOccurrenceStatus === 'disappeared'
      ? 'Biến mất'
      : safeOccurrenceStatus === 'new'
      ? 'Điểm mới (Chờ duyệt)'
      : 'Đã ghi nhận';

  const safeCoverImage =
    typeof plant.coverImage === 'string' && plant.coverImage.length > 0 && plant.coverImage.length <= 900000
      ? plant.coverImage
      : DEFAULT_FALLBACK_IMAGE;

  const safePhotos: PlantPhoto[] | undefined = Array.isArray(plant.photos)
    ? plant.photos
        .filter((ph): ph is PlantPhoto => Boolean(ph && typeof ph.url === 'string' && ph.url.length > 0 && ph.url.length <= 900000))
        .slice(0, 12)
        .map((ph, idx) => ({
          id: clampStr(ph.id || `photo-${idx + 1}`, 128) || `photo-${idx + 1}`,
          url: ph.url,
          caption: clampStr(ph.caption || '', 300),
          type: (['whole', 'leaf', 'flower', 'fruit', 'root'].includes(ph.type) ? ph.type : 'whole') as PlantPhoto['type'],
        }))
    : undefined;

  const safeOtherNames = Array.isArray(plant.otherNames)
    ? plant.otherNames
        .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        .slice(0, 20)
        .map((n) => clampStr(n, 100))
    : undefined;

  const safeLogs: PlantMonitoringLog[] | undefined = Array.isArray(plant.monitoringLogs)
    ? plant.monitoringLogs
        .filter((l): l is PlantMonitoringLog => Boolean(l && typeof l.id === 'string' && l.id.trim().length > 0))
        .slice(0, 100)
        .map((l) => {
          const safeLogStatus: 'present' | 'disappeared' = l.status === 'disappeared' ? 'disappeared' : 'present';
          const cleanLog: PlantMonitoringLog = {
            id: clampStr(l.id, 128),
            date: clampStr(l.date || new Date().toISOString().split('T')[0], 32),
            status: safeLogStatus,
            conservationStatus: safeLogStatus === 'disappeared' ? 'Biến mất' : 'Đã ghi nhận',
            statusNote: clampStr(l.statusNote || 'Ghi nhận khảo sát thực địa.', 2000),
            surveyor: clampStr(l.surveyor || 'Đoàn khảo sát thực địa Tam Anh', 200) || 'Đoàn khảo sát thực địa Tam Anh',
            createdAt: clampStr(l.createdAt || new Date().toISOString(), 64),
            approvalStatus: l.approvalStatus || 'approved',
            submittedByRole: l.submittedByRole || 'public',
          };
          if (typeof l.contactPhone === 'string' && l.contactPhone.trim()) {
            cleanLog.contactPhone = clampStr(l.contactPhone, 40);
          }
          if (typeof l.evidencePhoto === 'string' && l.evidencePhoto.length > 0 && l.evidencePhoto.length <= 900000) {
            cleanLog.evidencePhoto = l.evidencePhoto;
          }
          if (typeof l.reviewedBy === 'string' && l.reviewedBy.trim()) {
            cleanLog.reviewedBy = clampStr(l.reviewedBy, 200);
          }
          if (typeof l.reviewedAt === 'string' && l.reviewedAt.trim()) {
            cleanLog.reviewedAt = clampStr(l.reviewedAt, 64);
          }
          if (typeof l.rejectionReason === 'string' && l.rejectionReason.trim()) {
            cleanLog.rejectionReason = clampStr(l.rejectionReason, 500);
          }
          return cleanLog;
        })
    : undefined;

  const clean: MedicinalPlant = {
    id: safeId,
    vietnameseName: clampStr(plant.vietnameseName || 'Cây thuốc Tam Anh', 200) || 'Cây thuốc Tam Anh',
    scientificName: clampStr(plant.scientificName || 'Đang xác minh phân loại học', 200),
    family: clampStr(plant.family || 'Chưa phân loại', 200),
    coverImage: safeCoverImage,
    photos: safePhotos || [],
    shortDescription: clampStr(plant.shortDescription || '', 3000),
    identificationTraits: {
      growthForm: clampStr(plant.identificationTraits?.growthForm || '', 1000),
      leaves: clampStr(plant.identificationTraits?.leaves || '', 1000),
      flowers: clampStr(plant.identificationTraits?.flowers || '', 1000),
      fruits: clampStr(plant.identificationTraits?.fruits || '', 1000),
      roots: clampStr(plant.identificationTraits?.roots || '', 1000),
    },
    habitat: clampStr(plant.habitat || 'Xã Tam Anh', 500),
    habitatCategory: clampStr(plant.habitatCategory || 'garden', 64) as MedicinalPlant['habitatCategory'],
    location: {
      lat: safeLat,
      lng: safeLng,
      addressDescription: clampStr(plant.location?.addressDescription || 'Xã Tam Anh', 500),
      communeSection: clampStr(plant.location?.communeSection || 'Thôn Đức Bố', 200),
      ...(typeof plant.location?.elevationMeters === 'number' && Number.isFinite(plant.location.elevationMeters)
        ? { elevationMeters: plant.location.elevationMeters }
        : {}),
    },
    conservationStatus: safeConservationStatus,
    conservationLevel: clampStr(plant.conservationLevel || 'safe', 64) as MedicinalPlant['conservationLevel'],
    occurrenceStatus: safeOccurrenceStatus,
    isDisappeared: safeIsDisappeared,
    traditionalUses: {
      folkRemedies: Array.isArray(plant.traditionalUses?.folkRemedies)
        ? plant.traditionalUses.folkRemedies.filter((r): r is string => typeof r === 'string').slice(0, 30).map((r) => clampStr(r, 500))
        : [],
      partUsed: Array.isArray(plant.traditionalUses?.partUsed)
        ? plant.traditionalUses.partUsed.filter((p): p is string => typeof p === 'string').slice(0, 30).map((p) => clampStr(p, 200))
        : [],
      preparation: clampStr(plant.traditionalUses?.preparation || '', 2000),
      informantName: clampStr(plant.traditionalUses?.informantName || '', 200),
      informantRole: clampStr(plant.traditionalUses?.informantRole || '', 200),
      hasConsent: typeof plant.traditionalUses?.hasConsent === 'boolean' ? plant.traditionalUses.hasConsent : true,
    },
    dataSource: {
      type: (plant.dataSource?.type || 'field_survey_2026') as MedicinalPlant['dataSource']['type'],
      title: clampStr(plant.dataSource?.title || 'Khảo sát thực địa cây thuốc Tam Anh', 300),
      surveyor: clampStr(plant.dataSource?.surveyor || 'Người khảo sát thực địa', 200) || 'Người khảo sát thực địa',
      surveyDate: clampStr(plant.dataSource?.surveyDate || new Date().toISOString().split('T')[0], 32),
      ...(typeof plant.dataSource?.surveyorPhone === 'string' && plant.dataSource.surveyorPhone.trim()
        ? { surveyorPhone: clampStr(plant.dataSource.surveyorPhone, 40) }
        : {}),
      ...(typeof plant.dataSource?.surveyorAddress === 'string' && plant.dataSource.surveyorAddress.trim()
        ? { surveyorAddress: clampStr(plant.dataSource.surveyorAddress, 400) }
        : {}),
      ...(typeof plant.dataSource?.verifiedBy === 'string' && plant.dataSource.verifiedBy.trim()
        ? { verifiedBy: clampStr(plant.dataSource.verifiedBy, 200) }
        : {}),
      ...(typeof plant.dataSource?.notes === 'string' && plant.dataSource.notes.trim()
        ? { notes: clampStr(plant.dataSource.notes, 1000) }
        : {}),
    },
    status: safeStatus,
    surveyFrequencyCount:
      typeof plant.surveyFrequencyCount === 'number' && Number.isFinite(plant.surveyFrequencyCount) && plant.surveyFrequencyCount >= 0
        ? Math.min(100000, plant.surveyFrequencyCount)
        : 1,
    createdAt: clampStr(plant.createdAt || new Date().toISOString(), 64),
    updatedAt: clampStr(plant.updatedAt || new Date().toISOString(), 64),
  };

  if (typeof plant.genus === 'string' && plant.genus.trim()) {
    clean.genus = clampStr(plant.genus, 200);
  }
  if (typeof plant.species === 'string' && plant.species.trim()) {
    clean.species = clampStr(plant.species, 200);
  }
  if (safeOtherNames) {
    clean.otherNames = safeOtherNames;
  }
  if (safeLogs) {
    clean.monitoringLogs = safeLogs;
  }
  if (typeof plant.trendStatus === 'string' && plant.trendStatus.trim()) {
    clean.trendStatus = clampStr(plant.trendStatus, 32) as MedicinalPlant['trendStatus'];
  }

  return clean;
}

/**
 * Ensures serialized Firestore document stays safely under Firestore's 1 MiB limit (~820 KB target)
 * by adaptively re-compressing attached base64 photos if multiple images are attached.
 */
export async function fitPlantToFirestoreLimit(plant: MedicinalPlant): Promise<MedicinalPlant> {
  let working: MedicinalPlant = JSON.parse(JSON.stringify(plant));
  const measureBytes = (obj: unknown) => {
    const str = JSON.stringify(obj);
    return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(str).length : str.length * 2;
  };

  if (measureBytes(working) <= 820000) {
    return working;
  }

  const compressionSteps: Array<[number, number]> = [
    [680, 0.58],
    [520, 0.48],
    [400, 0.38],
  ];

  for (const [maxDim, quality] of compressionSteps) {
    if (working.coverImage && working.coverImage.startsWith('data:image')) {
      working.coverImage = await compressBase64Image(working.coverImage, maxDim, maxDim, quality, true);
    }
    if (Array.isArray(working.photos)) {
      const nextPhotos: PlantPhoto[] = [];
      for (const ph of working.photos) {
        if (ph.url && ph.url.startsWith('data:image')) {
          const compressed = await compressBase64Image(ph.url, maxDim, maxDim, quality, true);
          nextPhotos.push({ ...ph, url: compressed });
        } else {
          nextPhotos.push(ph);
        }
      }
      working.photos = nextPhotos;
      if (nextPhotos.length > 0 && working.coverImage.startsWith('data:image')) {
        working.coverImage = nextPhotos[0].url;
      }
    }
    if (measureBytes(working) <= 820000) {
      return working;
    }
  }

  // Final safety cap: keep coverImage + as many photos as fit under 880 KB
  if (Array.isArray(working.photos) && working.photos.length > 1) {
    while (working.photos.length > 1 && measureBytes(working) > 880000) {
      working.photos.pop();
    }
  }

  return working;
}

/**
 * Finds a guaranteed non-existing document ID in Firestore /plants before create
 * so community submissions never collide with existing IDs and trigger `update` PERMISSION_DENIED.
 */
async function resolveAvailablePlantIdInFirestore(candidateId: string): Promise<string> {
  const cleanCandidate = candidateId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  try {
    const firstSnap = await getDoc(doc(db, COLLECTION_NAME, cleanCandidate));
    if (!firstSnap.exists()) {
      return cleanCandidate;
    }

    // Candidate already exists in Firestore: increment suffix cleanly
    const locMatch = cleanCandidate.match(/^(.+-(?:LOC|P))(\d+)$/i);
    if (locMatch) {
      const prefix = locMatch[1];
      let num = parseInt(locMatch[2], 10) + 1;
      for (let i = 0; i < 8; i++) {
        const nextId = `${prefix}${num}`;
        const snap = await getDoc(doc(db, COLLECTION_NAME, nextId));
        if (!snap.exists()) return nextId;
        num += 1;
      }
    }

    const herbMatch = cleanCandidate.match(/^(TA-HERB-)(\d+)$/i);
    if (herbMatch) {
      const prefix = herbMatch[1];
      let num = parseInt(herbMatch[2], 10) + 1;
      for (let i = 0; i < 8; i++) {
        const nextId = `${prefix}${String(num).padStart(3, '0')}`;
        const snap = await getDoc(doc(db, COLLECTION_NAME, nextId));
        if (!snap.exists()) return nextId;
        num += 1;
      }
    }

    const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    return `${cleanCandidate.slice(0, 100)}-${uniqueSuffix}`;
  } catch {
    return cleanCandidate;
  }
}

/**
 * Initializes Firestore with existing local / default data if the cloud collection is empty
 * or if the base catalog (TA-HERB-001..015) has not been seeded yet.
 * Only executes seeding writes when an authenticated Admin is signed in (matching firestore.rules).
 */
export async function syncInitialPlantsToFirestore(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    const existingIds = new Set<string>();
    snapshot.forEach((docSnap) => existingIds.add(docSnap.id));
    const hasAnyBaseSpecies = INITIAL_PLANTS_DATA.some((p) => existingIds.has(p.id));

    if (snapshot.empty || !hasAnyBaseSpecies) {
      const isAuthorizedAdmin = await checkUserIsAdmin(auth.currentUser);
      if (!isAuthorizedAdmin) {
        return;
      }

      console.log('Seeding initial base plants to cloud Firestore...');
      const batch = writeBatch(db);
      let count = 0;

      INITIAL_PLANTS_DATA.forEach((plant) => {
        if (!plant.id || existingIds.has(plant.id)) return;
        const cleanPlant = sanitizePlantForFirestore(plant);
        const docRef = doc(db, COLLECTION_NAME, cleanPlant.id);
        batch.set(docRef, JSON.parse(JSON.stringify(cleanPlant)));
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`Seeded ${count} initial plants successfully to cloud Firestore.`);
      }
    }
  } catch (err) {
    console.warn('Could not check or seed initial plants to Firestore:', err);
  }
}

// Tracks locally submitted pending surveys while their background Firestore write is in flight
// so real-time onSnapshot events never prematurely overwrite them.
const inFlightPendingPlants = new Map<string, MedicinalPlant>();

export function markPendingPlantUpload(plant: MedicinalPlant): void {
  if (plant && plant.id) {
    inFlightPendingPlants.set(plant.id, plant);
  }
}

export function clearPendingPlantUpload(plantId: string): void {
  if (plantId) {
    inFlightPendingPlants.delete(plantId);
  }
}

/**
 * Creates a brand-new survey plant or new survey location point in Firestore,
 * guaranteeing size compliance, strict schema compliance, and collision-free document ID.
 */
export async function createSurveyPlantInFirestore(plant: MedicinalPlant): Promise<MedicinalPlant> {
  const fitted = await fitPlantToFirestoreLimit(plant);
  let sanitized = sanitizePlantForFirestore(fitted);
  const oldId = sanitized.id;
  const confirmedId = await resolveAvailablePlantIdInFirestore(oldId);

  if (confirmedId !== oldId) {
    sanitized = {
      ...sanitized,
      id: confirmedId,
      monitoringLogs: (sanitized.monitoringLogs || []).map((log) =>
        log.id === `log-init-${oldId}`.slice(0, 128) ? { ...log, id: `log-init-${confirmedId}`.slice(0, 128) } : log
      ),
    };
    if (inFlightPendingPlants.has(oldId)) {
      inFlightPendingPlants.delete(oldId);
      inFlightPendingPlants.set(confirmedId, sanitized);
    }
  }

  const path = `${COLLECTION_NAME}/${sanitized.id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, sanitized.id);
    const cleanData = JSON.parse(JSON.stringify(sanitized));
    await setDoc(docRef, cleanData);
    return sanitized;
  } catch (err) {
    clearPendingPlantUpload(sanitized.id);
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Saves or updates a single plant in Firestore in real-time.
 */
export async function savePlantToFirestore(
  plant: MedicinalPlant,
  isCreateOnly: boolean = false
): Promise<void> {
  if (!plant || !plant.id) return;
  const fitted = await fitPlantToFirestoreLimit(plant);
  const sanitized = sanitizePlantForFirestore(fitted);
  const path = `${COLLECTION_NAME}/${sanitized.id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, sanitized.id);
    const cleanData = JSON.parse(JSON.stringify(sanitized));
    if (isCreateOnly) {
      await setDoc(docRef, cleanData);
    } else {
      await setDoc(docRef, cleanData, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, isCreateOnly ? OperationType.CREATE : OperationType.WRITE, path);
  }
}

/**
 * Deletes a plant document from Firestore (Admin only).
 */
export async function deletePlantFromFirestore(plantId: string): Promise<void> {
  if (!plantId) return;
  const path = `${COLLECTION_NAME}/${plantId}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, plantId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Batch saves a list of plants (Admin only: e.g. after import or restore).
 */
export async function batchSavePlantsToFirestore(plants: MedicinalPlant[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    plants.forEach((plant) => {
      if (!plant.id) return;
      const cleanPlant = sanitizePlantForFirestore(plant);
      const docRef = doc(db, COLLECTION_NAME, cleanPlant.id);
      batch.set(docRef, JSON.parse(JSON.stringify(cleanPlant)), { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
  }
}

/**
 * Creates a pending community monitoring log in /surveys/{surveyId} without modifying /plants/{plantId}.
 */
export async function createPendingSurveyLogInFirestore(
  survey: PendingCommunitySurvey
): Promise<void> {
  if (!survey || !survey.id) return;
  const path = `${SURVEYS_COLLECTION}/${survey.id}`;
  try {
    let evidencePhoto = survey.evidencePhoto;
    if (typeof evidencePhoto === 'string' && evidencePhoto.startsWith('data:image') && evidencePhoto.length > 780000) {
      evidencePhoto = await compressBase64Image(evidencePhoto, 640, 640, 0.55, true);
      if (evidencePhoto.length > 880000) {
        evidencePhoto = await compressBase64Image(evidencePhoto, 460, 460, 0.42, true);
      }
    }

    const safeStatus: 'present' | 'disappeared' = survey.status === 'disappeared' ? 'disappeared' : 'present';
    const cleanSurvey: PendingCommunitySurvey = {
      id: clampStr(survey.id, 128).replace(/[^a-zA-Z0-9_\-]/g, '-'),
      plantId: clampStr(survey.plantId, 128).replace(/[^a-zA-Z0-9_\-]/g, '-'),
      date: clampStr(survey.date || new Date().toISOString().split('T')[0], 32),
      status: safeStatus,
      conservationStatus: safeStatus === 'disappeared' ? 'Biến mất' : 'Đã ghi nhận',
      statusNote: clampStr(survey.statusNote || 'Báo cáo thực địa', 2000) || 'Báo cáo thực địa',
      surveyor: clampStr(survey.surveyor || 'Người khảo sát', 200) || 'Người khảo sát',
      createdAt: clampStr(survey.createdAt || new Date().toISOString(), 64),
      approvalStatus: 'pending',
      submittedByRole: 'public',
    };
    if (typeof survey.plantName === 'string' && survey.plantName.trim()) {
      cleanSurvey.plantName = clampStr(survey.plantName, 200);
    }
    if (typeof survey.plantScientificName === 'string' && survey.plantScientificName.trim()) {
      cleanSurvey.plantScientificName = clampStr(survey.plantScientificName, 200);
    }
    if (typeof survey.contactPhone === 'string' && survey.contactPhone.trim()) {
      cleanSurvey.contactPhone = clampStr(survey.contactPhone, 40);
    }
    if (typeof evidencePhoto === 'string' && evidencePhoto.length > 0 && evidencePhoto.length <= 900000) {
      cleanSurvey.evidencePhoto = evidencePhoto;
    }

    const docRef = doc(db, SURVEYS_COLLECTION, cleanSurvey.id);
    const cleanData = JSON.parse(JSON.stringify(cleanSurvey));
    await setDoc(docRef, cleanData);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Deletes a processed community monitoring log from /surveys/{surveyId} (Admin only).
 */
export async function deletePendingSurveyLogFromFirestore(surveyId: string): Promise<void> {
  if (!surveyId) return;
  const path = `${SURVEYS_COLLECTION}/${surveyId}`;
  try {
    await deleteDoc(doc(db, SURVEYS_COLLECTION, surveyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to pending community monitoring logs in /surveys (Admin only).
 */
export function subscribeToPendingSurveysRealtime(
  callback: (surveys: PendingCommunitySurvey[]) => void
): () => void {
  const colRef = collection(db, SURVEYS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PendingCommunitySurvey[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PendingCommunitySurvey;
        if (data && data.approvalStatus === 'pending') {
          const safeStatus: 'present' | 'disappeared' =
            data.status === 'disappeared' ? 'disappeared' : 'present';
          list.push({
            ...data,
            status: safeStatus,
            conservationStatus: safeStatus === 'disappeared' ? 'Biến mất' : 'Đã ghi nhận',
          });
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, SURVEYS_COLLECTION);
    }
  );
}

/**
 * Subscribes to real-time updates from Firestore.
 * When data changes on any device, the callback is fired with the deduplicated updated list.
 */
export function subscribeToPlantsRealtime(
  callback: (plants: MedicinalPlant[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const colRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        const local = getStoredPlants();
        callback(local);
        return;
      }

      const cloudPlants: MedicinalPlant[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as MedicinalPlant;
        if (raw?.id) {
          inFlightPendingPlants.delete(raw.id);
        }
        const normalizedLogs = Array.isArray(raw?.monitoringLogs)
          ? raw.monitoringLogs.map((l) => {
              const safeLogStatus: 'present' | 'disappeared' =
                l.status === 'disappeared' ? 'disappeared' : 'present';
              return {
                ...l,
                status: safeLogStatus,
                conservationStatus: (safeLogStatus === 'disappeared'
                  ? 'Biến mất'
                  : 'Đã ghi nhận') as PlantMonitoringLog['conservationStatus'],
              };
            })
          : raw?.monitoringLogs;
        cloudPlants.push(
          normalizedLogs ? { ...raw, monitoringLogs: normalizedLogs } : raw
        );
      });

      // If Firestore has only unseeded pending community submissions (no base verified plants yet),
      // keep the default catalog visible alongside cloud pending surveys until Admin signs in to seed them.
      const cloudIds = new Set(cloudPlants.map((p) => p.id));
      const hasAnyBaseSpecies = INITIAL_PLANTS_DATA.some((bp) => cloudIds.has(bp.id));
      const onlyPendingDocs = cloudPlants.length > 0 && cloudPlants.every((p) => p.status === 'pending');

      const baseMerged =
        !hasAnyBaseSpecies && onlyPendingDocs
          ? [...cloudPlants, ...INITIAL_PLANTS_DATA]
          : cloudPlants;

      // Preserve any locally submitted surveys whose background Firestore write is still in flight
      const pendingInFlight: MedicinalPlant[] = [];
      inFlightPendingPlants.forEach((p, id) => {
        if (!cloudIds.has(id)) {
          pendingInFlight.push(p);
        }
      });

      const merged = [...pendingInFlight, ...baseMerged];
      const deduplicated = deduplicatePlants(merged);
      savePlants(deduplicated);
      callback(deduplicated);
    },
    (err) => {
      console.warn('Real-time Firestore sync encountered an issue, using local cache:', err);
      callback(getStoredPlants());
      if (onError) {
        onError(err);
      } else {
        handleFirestoreError(err, OperationType.GET, COLLECTION_NAME);
      }
    }
  );
}
