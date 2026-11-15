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
import { MedicinalPlant, PlantMonitoringLog } from '../types';
import { getStoredPlants, savePlants, deduplicatePlants } from '../utils/storage';

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

/**
 * Initializes Firestore with existing local / default data if the cloud collection is empty.
 * Only executes seeding writes when an authenticated Admin is signed in (matching firestore.rules).
 */
export async function syncInitialPlantsToFirestore(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      const isAuthorizedAdmin = await checkUserIsAdmin(auth.currentUser);
      if (!isAuthorizedAdmin) {
        return;
      }

      console.log('Cloud Firestore collection empty. Seeding initial plants to cloud...');
      const localPlants = getStoredPlants();
      const batch = writeBatch(db);

      localPlants.forEach((plant) => {
        if (!plant.id) return;
        const docRef = doc(db, COLLECTION_NAME, plant.id);
        batch.set(docRef, JSON.parse(JSON.stringify(plant)));
      });

      await batch.commit();
      console.log('Seeded plants successfully to cloud Firestore.');
    }
  } catch (err) {
    console.warn('Could not check or seed initial plants to Firestore:', err);
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
  const path = `${COLLECTION_NAME}/${plant.id}`;
  try {
    const docRef = doc(db, COLLECTION_NAME, plant.id);
    const cleanData = JSON.parse(JSON.stringify(plant));
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
      const docRef = doc(db, COLLECTION_NAME, plant.id);
      batch.set(docRef, JSON.parse(JSON.stringify(plant)), { merge: true });
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
    const docRef = doc(db, SURVEYS_COLLECTION, survey.id);
    const cleanData = JSON.parse(JSON.stringify(survey));
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
          list.push(data);
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
        const data = docSnap.data() as MedicinalPlant;
        cloudPlants.push(data);
      });

      const deduplicated = deduplicatePlants(cloudPlants);
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
