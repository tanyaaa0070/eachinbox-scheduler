import 'dotenv/config';
import { PrismaClient, CampaignStatus, EmailStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log('Seeding rich demo data...');

  const user = await prisma.user.findFirst({
    where: { email: 'tanya.demo@reachinbox.ai' },
  });

  if (!user) {
    console.log('Demo user not found. Please log in once first.');
    return;
  }

  const sender = await prisma.sender.findFirst({
    where: { userId: user.id },
  });

  if (!sender) {
    console.log('No sender found for user.');
    return;
  }

  // Create sample campaign 1: Product Launch Outreach
  const campaign1 = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      name: 'Q3 Product Announcement Campaign',
      subject: 'Introducing our new AI Sales Assistant 🚀',
      body: '<p>Hi {{name}},</p><p>We are thrilled to unveil our new automated inbox engine designed for scale!</p><p>Best,<br>ReachInbox Team</p>',
      startTime: new Date(),
      timezone: 'UTC',
      delayBetweenEmails: 2,
      hourlyLimit: 50,
      totalRecipients: 5,
      status: CampaignStatus.IN_PROGRESS,
    },
  });

  // Create scheduled emails for campaign 1
  const recipients = [
    { name: 'Alex Johnson', email: 'alex.j@example.com' },
    { name: 'Sarah Miller', email: 'sarah.m@example.com' },
    { name: 'David Chen', email: 'david.chen@example.com' },
    { name: 'Emily Taylor', email: 'emily.t@example.com' },
    { name: 'Michael Brown', email: 'michael.b@example.com' },
  ];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const isSent = i < 2;
    await prisma.scheduledEmail.create({
      data: {
        campaignId: campaign1.id,
        senderId: sender.id,
        recipient: r.email,
        subject: 'Introducing our new AI Sales Assistant 🚀',
        body: `<p>Hi ${r.name},</p><p>We are thrilled to unveil our new automated inbox engine designed for scale!</p><p>Best,<br>ReachInbox Team</p>`,
        scheduledAt: new Date(Date.now() + i * 5000),
        sentAt: isSent ? new Date(Date.now() - (2 - i) * 60000) : null,
        status: isSent ? EmailStatus.SENT : EmailStatus.SCHEDULED,
        sequenceNumber: i + 1,
        idempotencyKey: `demo-campaign1-seq-${i + 1}-${Date.now()}`,
        previewUrl: isSent ? 'https://ethereal.email/message/demo-message-sample-1' : null,
      },
    });
  }

  // Create sample campaign 2: Completed Welcome Series
  const campaign2 = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      name: 'New User Onboarding Drip',
      subject: 'Welcome to ReachInbox Scheduler!',
      body: '<p>Welcome aboard! Here are 3 tips to get the most out of your email sequences.</p>',
      startTime: new Date(Date.now() - 3600000),
      timezone: 'UTC',
      delayBetweenEmails: 3,
      hourlyLimit: 50,
      totalRecipients: 3,
      status: CampaignStatus.COMPLETED,
    },
  });

  for (let i = 0; i < 3; i++) {
    await prisma.scheduledEmail.create({
      data: {
        campaignId: campaign2.id,
        senderId: sender.id,
        recipient: `founder${i + 1}@startup.io`,
        subject: 'Welcome to ReachInbox Scheduler!',
        body: '<p>Welcome aboard! Here are 3 tips to get the most out of your email sequences.</p>',
        scheduledAt: new Date(Date.now() - 3000000 + i * 3000),
        sentAt: new Date(Date.now() - 3000000 + i * 3000),
        status: EmailStatus.SENT,
        sequenceNumber: i + 1,
        idempotencyKey: `demo-campaign2-seq-${i + 1}-${Date.now()}`,
        previewUrl: 'https://ethereal.email/message/demo-message-sample-2',
      },
    });
  }

  console.log('✅ Rich demo data populated successfully!');
}

seedDemoData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
