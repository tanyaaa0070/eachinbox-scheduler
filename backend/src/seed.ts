/**
 * Seed script to create a default sender account for the first user.
 * Run: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // Check if any users exist
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('No users found. Please log in with Google OAuth first.');
    console.log('After logging in, run this seed script again to create default senders.\n');
    return;
  }

  // Get the first user
  const user = await prisma.user.findFirst();
  if (!user) return;

  // Check if sender already exists
  const existingSender = await prisma.sender.findFirst({
    where: { userId: user.id },
  });

  if (existingSender) {
    console.log(`Sender already exists: ${existingSender.email}`);
    return;
  }

  // Create default sender using Ethereal credentials from env
  const etherealUser = process.env['ETHEREAL_USER'];
  const etherealPass = process.env['ETHEREAL_PASSWORD'];

  if (!etherealUser || !etherealPass) {
    console.log('ETHEREAL_USER and ETHEREAL_PASSWORD must be set in .env');
    console.log('Run: npm run setup:ethereal');
    return;
  }

  const sender = await prisma.sender.create({
    data: {
      userId: user.id,
      email: etherealUser,
      displayName: user.name,
      smtpHost: process.env['ETHEREAL_HOST'] ?? 'smtp.ethereal.email',
      smtpPort: parseInt(process.env['ETHEREAL_PORT'] ?? '587', 10),
      smtpUser: etherealUser,
      smtpPass: etherealPass,
      hourlyLimit: parseInt(process.env['DEFAULT_HOURLY_LIMIT'] ?? '50', 10),
    },
  });

  console.log(`✅ Default sender created: ${sender.email}`);
  console.log(`   Hourly limit: ${sender.hourlyLimit}`);
  console.log(`   Display name: ${sender.displayName}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
