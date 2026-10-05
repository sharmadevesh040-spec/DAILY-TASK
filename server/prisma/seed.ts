import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Work', color: '#3b82f6' },
  { name: 'Personal', color: '#8b5cf6' },
  { name: 'Study', color: '#f59e0b' },
  { name: 'Fitness', color: '#10b981' },
  { name: 'Projects', color: '#ef4444' },
  { name: 'Other', color: '#6b7280' },
];

async function main() {
  console.log('Seeding database...');

  // Find all users without default categories and seed them
  const users = await prisma.user.findMany();
  for (const user of users) {
    for (const cat of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name: cat.name } },
        update: {},
        create: { userId: user.id, name: cat.name, color: cat.color },
      });
    }
  }

  console.log(`Seeded default categories for ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
