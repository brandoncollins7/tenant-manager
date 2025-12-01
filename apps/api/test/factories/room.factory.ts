import { Room } from '@prisma/client';
import { BaseFactory, uniqueId } from './base.factory';
import { PrismaService } from '../../src/prisma/prisma.service';

interface RoomFactoryInput {
  unitId: string;
  roomNumber?: string;
}

export class RoomFactory extends BaseFactory<RoomFactoryInput, Room> {
  build(overrides: RoomFactoryInput): RoomFactoryInput {
    return {
      roomNumber: `Room ${uniqueId()}`,
      ...overrides,
    };
  }

  async create(overrides: RoomFactoryInput): Promise<Room> {
    const data = this.build(overrides);
    return this.prisma.room.create({
      data: {
        roomNumber: data.roomNumber!,
        unit: { connect: { id: data.unitId } },
      },
    });
  }
}
