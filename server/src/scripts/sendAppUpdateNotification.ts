import 'dotenv/config';
import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notificationService';

async function sendUpdateNotificationToAllUsers() {
  console.log('📢 Starting App Update Notification broadcast...');

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  console.log(`Found ${users.length} registered user(s).`);

  if (users.length === 0) {
    console.log('No users found in database.');
    return;
  }

  const title = '🚀 App Updated: Check Out New Features!';
  const message =
    'TaskFlow has been updated! Explore the new AI Smart Planner (/planner), Photo-Verified Task Completion with AI vision, real-time Notifications, and upcoming Auto-Scheduling. Tap to view your new workspace.';

  const metadata = {
    category: 'app_update',
    version: '2.0.0',
    features: [
      'Photo-Required Task Completion with AI Vision Verification',
      'Natural-Language AI Smart Planner & Rescheduler',
      'In-App Notification Center & Web Push',
      'Automatic AI Schedule Preview (Coming Soon)',
    ],
    timestamp: new Date().toISOString(),
  };

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      // Check if user already received this exact app update notification to avoid duplicates
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          title,
        },
      });

      if (alreadyNotified) {
        console.log(`⏭️ User ${user.email} (${user.id}) already received this notification. Skipping.`);
        successCount++;
        continue;
      }

      await createNotification({
        userId: user.id,
        type: 'SYSTEM',
        title,
        message,
        metadata,
      });

      console.log(`✅ Sent update notification to user: ${user.email} (${user.id})`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ Failed sending notification to ${user.email}:`, err?.message || err);
      failCount++;
    }
  }

  console.log('\n=========================================');
  console.log(`Broadcast completed!`);
  console.log(`Total users: ${users.length}`);
  console.log(`Delivered: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('=========================================\n');
}

sendUpdateNotificationToAllUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal broadcast error:', err);
    process.exit(1);
  });
