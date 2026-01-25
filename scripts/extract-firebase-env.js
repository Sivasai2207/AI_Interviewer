const fs = require('fs');
const path = require('path');

// Find the firebase service account file in the root directory
const rootDir = path.join(__dirname, '..');
const files = fs.readdirSync(rootDir);
const serviceAccountFile = files.find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));

if (!serviceAccountFile) {
    console.error('❌ Could not find a file matching "firebase-adminsdk*.json" in the root directory.');
    process.exit(1);
}

const filePath = path.join(rootDir, serviceAccountFile);
console.log(`✅ Found service account file: ${serviceAccountFile}\n`);

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);

    console.log('--- COPY THESE VALUES TO VERCEL ENVIRONMENT VARIABLES ---\n');
    
    console.log('1. Key: FIREBASE_CLIENT_EMAIL');
    console.log('   Value:');
    console.log(config.client_email);
    console.log('\n');

    console.log('2. Key: FIREBASE_PRIVATE_KEY');
    console.log('   Value (copy the whole block):');
    console.log(config.private_key);
    console.log('\n');
    
    console.log('---------------------------------------------------------');
    console.log('NOTE: The private_key handles newlines automatically via our updated admin.ts code.');
    console.log('Just copy and paste exactly as shown.');

} catch (error) {
    console.error('❌ Error reading or parsing the file:', error.message);
}
