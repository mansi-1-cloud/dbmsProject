import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  await prisma.token.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        name: 'Alice Johnson',
        password: await bcrypt.hash('password123', 10),
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        name: 'Bob Smith',
        password: await bcrypt.hash('password123', 10),
      },
    }),
    prisma.user.create({
      data: {
        email: 'charlie@example.com',
        name: 'Charlie Brown',
        password: await bcrypt.hash('password123', 10),
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        email: 'printshop@example.com',
        name: 'Quick Print Shop',
        password: await bcrypt.hash('vendor123', 10),
        services: ['printing', 'scanning', 'photocopying'],
      },
    }),
    prisma.vendor.create({
      data: {
        email: 'bindery@example.com',
        name: 'Pro Bindery Services',
        password: await bcrypt.hash('vendor123', 10),
        services: ['binding', 'lamination'],
      },
    }),
    prisma.vendor.create({
      data: {
        email: 'multiservice@example.com',
        name: 'All-in-One Services',
        password: await bcrypt.hash('vendor123', 10),
        services: ['printing', 'binding', 'lamination', 'scanning'],
      },
    }),
  ]);

  console.log(`✅ Created ${vendors.length} vendors`);

  // Create some sample tokens
  const tokens = await Promise.all([
    prisma.token.create({
      data: {
        userId: users[0].id,
        vendorId: vendors[0].id,
        serviceType: 'printing',
        params: { pages: 50, color: true },
        status: 'PENDING',
      },
    }),
    prisma.token.create({
      data: {
        userId: users[1].id,
        vendorId: vendors[0].id,
        serviceType: 'scanning',
        params: { pages: 20 },
        status: 'PENDING',
      },
    }),
    prisma.token.create({
      data: {
        userId: users[2].id,
        vendorId: vendors[1].id,
        serviceType: 'binding',
        params: { type: 'spiral', pages: 100 },
        status: 'PENDING',
      },
    }),
  ]);

  console.log(`✅ Created ${tokens.length} tokens`);

  console.log('\n📋 Seed Data Summary:');
  console.log('-------------------');
  console.log('\n👥 Users (password: password123):');
  users.forEach(u => console.log(`   - ${u.email}`));
  
  console.log('\n🏪 Vendors (password: vendor123):');
  vendors.forEach(v => console.log(`   - ${v.email} | Services: ${v.services.join(', ')}`));
  
  console.log('\n🎫 Sample Tokens:');
  tokens.forEach(t => console.log(`   - ${t.serviceType} (${t.status})`));

  console.log('\n✅ Seeding complete!');
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
