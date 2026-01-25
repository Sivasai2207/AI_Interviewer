const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const key = crypto.randomBytes(32).toString('hex');

// Read existing file to check if key exists
let currentContent = '';
if (fs.existsSync(envPath)) {
    currentContent = fs.readFileSync(envPath, 'utf8');
}

if (currentContent.includes('ENCRYPTION_KEY=')) {
    console.log('Key already exists');
} else {
    // Ensure newline
    const prefix = currentContent.endsWith('\n') ? '' : '\n';
    const content = `${prefix}# Auto-generated Encryption Key\nENCRYPTION_KEY=${key}\n`;
    fs.appendFileSync(envPath, content);
    console.log('Added ENCRYPTION_KEY to .env.local');
}
