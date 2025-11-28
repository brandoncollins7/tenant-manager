import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production: Only create admin user (upsert to avoid duplicates)
    const admin = await prisma.admin.upsert({
      where: { email: 'brandoncollins@gmail.com' },
      update: {},
      create: {
        email: 'brandoncollins@gmail.com',
        name: 'Brandon Collins',
      },
    });

    console.log(`✅ Admin user ready: ${admin.email}`);
    console.log('Production seeding completed!');
    return;
  }

  // Development: Create full test dataset
  // Create a unit
  const unit = await prisma.unit.create({
    data: {
      name: '123 Main St - Unit 4B',
      timezone: 'America/Toronto',
    },
  });

  console.log(`Created unit: ${unit.name}`);

  // Create default chores
  const chores = await Promise.all([
    prisma.choreDefinition.create({
      data: {
        unitId: unit.id,
        name: 'Living Room & Bathroom',
        description: 'Clean living room and bathroom',
        icon: '🧹',
        sortOrder: 1,
      },
    }),
    prisma.choreDefinition.create({
      data: {
        unitId: unit.id,
        name: 'Take Out Garbage',
        description: 'Empty all trash bins and take to curb',
        icon: '🗑️',
        sortOrder: 2,
      },
    }),
    prisma.choreDefinition.create({
      data: {
        unitId: unit.id,
        name: 'Sweep & Mop Floors',
        description: 'Sweep and mop common area floors',
        icon: '🧽',
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`Created ${chores.length} chore definitions`);

  // Create 4 rooms
  const rooms = await Promise.all([
    prisma.room.create({ data: { unitId: unit.id, roomNumber: 'Room 1' } }),
    prisma.room.create({ data: { unitId: unit.id, roomNumber: 'Room 2' } }),
    prisma.room.create({ data: { unitId: unit.id, roomNumber: 'Room 3' } }),
    prisma.room.create({ data: { unitId: unit.id, roomNumber: 'Room 4' } }),
  ]);

  console.log(`Created ${rooms.length} rooms`);

  // Create an admin
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@example.com',
      name: 'Property Manager',
    },
  });

  console.log(`Created admin: ${admin.email}`);

  // Create sample tenants (one per room)
  const tenants = await Promise.all([
    prisma.tenant.create({
      data: {
        roomId: rooms[0].id,
        email: 'tenant1@example.com',
        phone: '555-0101',
        startDate: new Date('2024-01-01'),
        occupants: {
          create: { name: 'John Smith', choreDay: 1 }, // Monday
        },
      },
    }),
    prisma.tenant.create({
      data: {
        roomId: rooms[1].id,
        email: 'tenant2@example.com',
        phone: '555-0102',
        startDate: new Date('2024-02-01'),
        occupants: {
          create: [
            { name: 'Jane Doe', choreDay: 2 }, // Tuesday
            { name: 'Jim Doe', choreDay: 3 }, // Wednesday (couple)
          ],
        },
      },
    }),
    prisma.tenant.create({
      data: {
        roomId: rooms[2].id,
        email: 'tenant3@example.com',
        phone: '555-0103',
        startDate: new Date('2024-03-01'),
        occupants: {
          create: { name: 'Bob Wilson', choreDay: 4 }, // Thursday
        },
      },
    }),
    prisma.tenant.create({
      data: {
        roomId: rooms[3].id,
        email: 'tenant4@example.com',
        phone: '555-0104',
        startDate: new Date('2024-04-01'),
        occupants: {
          create: { name: 'Alice Brown', choreDay: 5 }, // Friday
        },
      },
    }),
  ]);

  console.log(`Created ${tenants.length} tenants with occupants`);

  console.log('Seeding completed!');
  console.log('\nYou can log in as:');
  console.log('- Admin: admin@example.com');
  console.log('- Tenant 1: tenant1@example.com (John Smith - Monday)');
  console.log('- Tenant 2: tenant2@example.com (Jane & Jim Doe - Tue/Wed)');
  console.log('- Tenant 3: tenant3@example.com (Bob Wilson - Thursday)');
  console.log('- Tenant 4: tenant4@example.com (Alice Brown - Friday)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
