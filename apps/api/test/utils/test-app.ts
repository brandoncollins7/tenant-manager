import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  jwtService: JwtService;
  module: TestingModule;
}

export async function createTestApp(): Promise<TestContext> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();

  // Mirror production configuration from main.ts
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  const prisma = module.get<PrismaService>(PrismaService);
  const jwtService = module.get<JwtService>(JwtService);

  return { app, prisma, jwtService, module };
}

export async function closeTestApp(ctx: TestContext): Promise<void> {
  await ctx.prisma.$disconnect();
  await ctx.app.close();
}
