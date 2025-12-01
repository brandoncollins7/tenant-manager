import { PrismaService } from '../../src/prisma/prisma.service';

export abstract class BaseFactory<TCreate, TModel> {
  constructor(protected readonly prisma: PrismaService) {}

  abstract build(overrides?: Partial<TCreate>): TCreate;
  abstract create(overrides?: Partial<TCreate>): Promise<TModel>;

  async createMany(
    count: number,
    overrides?: Partial<TCreate>,
  ): Promise<TModel[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(overrides)),
    );
  }
}

let counter = 0;

export function uniqueId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${++counter}`;
}

export function uniqueEmail(prefix: string = 'user'): string {
  return `${prefix}-${Date.now()}-${++counter}@test.example.com`;
}
