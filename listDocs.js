import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listDocs() {
  console.log('--- Projects ---');
  const projectSnap = await db.collection('projects').get();
  projectSnap.forEach(doc => {
    console.log(`ID: "${doc.id}" | Name: "${doc.data().name}"`);
  });
  process.exit(0);
}

listDocs();
