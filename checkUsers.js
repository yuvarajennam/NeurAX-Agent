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

async function listUsers() {
  console.log('--- Firebase Authentication Users ---');
  try {
    const listUsersResult = await admin.auth().listUsers(10);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`User: ${userRecord.email} | UID: ${userRecord.uid} | Created: ${userRecord.metadata.creationTime}`);
    });
    
    if (listUsersResult.users.length === 0) {
      console.log('No users found in Firebase Authentication.');
    }
  } catch (error) {
    console.error('Error listing users:', error);
  }
  process.exit(0);
}

listUsers();
