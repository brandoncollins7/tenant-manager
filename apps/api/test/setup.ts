import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Reset database by truncating all tables (respects foreign key constraints via CASCADE)
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
}

// Increase default timeout for E2E tests
jest.setTimeout(30000);
