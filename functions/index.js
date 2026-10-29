import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { makeLookup } from './nokia.js';

initializeApp();
export const lookupNokia = onCall(
  { region: 'southamerica-east1', maxInstances: 5 },
  makeLookup({ db: getFirestore(), ErrorType: HttpsError }),
);
