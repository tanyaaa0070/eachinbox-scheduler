/**
 * Script to generate Ethereal test SMTP credentials.
 * Run: npm run setup:ethereal
 */
import nodemailer from 'nodemailer';

async function main() {
  console.log('Creating Ethereal test account...\n');

  const account = await nodemailer.createTestAccount();

  console.log('✅ Ethereal test account created!\n');
  console.log('Add these to your .env file:\n');
  console.log(`ETHEREAL_HOST=${account.smtp.host}`);
  console.log(`ETHEREAL_PORT=${account.smtp.port}`);
  console.log(`ETHEREAL_USER=${account.user}`);
  console.log(`ETHEREAL_PASSWORD=${account.pass}`);
  console.log(`\nWeb interface: https://ethereal.email`);
  console.log(`Login with the user/password above to view sent emails.`);
}

main().catch(console.error);
