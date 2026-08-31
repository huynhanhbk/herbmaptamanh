import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { MedicinalPlant } from '../types';
import { getStoredPlants, savePlants, deduplicatePlants } from '../utils/storage';

const COLLECTION_NAME = 'plants';

/**
 * Initializes Firestore with existing local / default data if the cloud collection is empty.
 * This guarantees all devices immediately see the full database.
 */
export async function syncInitialPlantsToFirestore(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
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
export async function savePlantToFirestore(plant: MedicinalPlant): Promise<void> {
  if (!plant || !plant.id) return;
  try {
    const docRef = doc(db, COLLECTION_NAME, plant.id);
    const cleanData = JSON.parse(JSON.stringify(plant));
    await setDoc(docRef, cleanData, { merge: true });
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
    const docRef = doc(db, COLLECTION_NAME, plantId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting plant from Firestore:', err);
  }
}

/**
 * Batch saves a list of plants (e.g. after import or restore).
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
    console.error('Error in batchSavePlantsToFirestore:', err);
  }
}

/**
 * Subscribes to real-time updates from Firestore.
 * When data changes on any device, the callback is fired with the deduplicated updated list.
 */
export function subscribeToPlantsRealtime(
  callback: (plants: MedicinalPlant[]) => void,
  onError?: (error: any) => void
): () => void {
  const colRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is still empty or initializing, fallback to local storage
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
      // Synchronize back to local storage cache
      savePlants(deduplicated);
      callback(deduplicated);
    },
    (err) => {
      console.warn('Real-time Firestore sync encountered an issue, using local cache:', err);
      if (onError) onError(err);
      // Fallback
      callback(getStoredPlants());
    }
  );
}
