import admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// THE USER MUST PROVIDE THIS FILE
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ Error: serviceAccountKey.json not found in project root.');
  console.error('Please download your service account key from the Firebase Console:');
  console.error('Project Settings > Service Accounts > Generate new private key\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Mapping of CSV files to Firestore collections
const taskConfig = [
  { file: 'employees.csv', collection: 'employees' },
  { file: 'projects.csv', collection: 'projects' },
  { file: 'tools.csv', collection: 'tools' },
  { file: 'project_history.csv', collection: 'projectHistory' }
];

const numericFields = [
  'experience_years', 
  'current_workload_percent', 
  'deadline_days', 
  'priority_score',
  'success_score',
  'completion_days',
  'team_size'
];

async function seedFirestore() {
  console.log('🚀 Starting Firestore seeding process...\n');

  for (const item of taskConfig) {
    const filePath = path.join(__dirname, 'data', item.file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Warning: File not found: ${filePath}, skipping collection "${item.collection}"`);
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });

      console.log(`Uploading ${item.collection}...`);
      
      let count = 0;
      for (const record of records) {
        const columns = Object.keys(record);
        if (columns.length === 0) continue;

        // Use the first column as the Document ID
        const docId = record[columns[0]];
        
        const dataToUpload = {};
        columns.forEach(col => {
          let value = record[col];

          // 1. Convert semicolon-separated fields to arrays
          if (typeof value === 'string' && value.includes(';')) {
            value = value.split(';').map(s => s.trim());
          }

          // 2. Convert specific fields to numbers
          if (numericFields.includes(col) && typeof value === 'string' && value.trim() !== '') {
            const num = Number(value);
            if (!isNaN(num)) {
              value = num;
            }
          }

          dataToUpload[col] = value;
        });

        // Set document in Firestore
        await db.collection(item.collection).doc(String(docId)).set(dataToUpload);
        count++;
      }

      console.log(`✅ done (${count} records)`);
    } catch (err) {
      console.error(`❌ Error uploading collection "${item.collection}":`, err.message);
    }
  }

  console.log('\n✨ All uploads complete!');
  process.exit(0);
}

seedFirestore().catch(err => {
  console.error('\n💥 Critical Error:', err);
  process.exit(1);
});
