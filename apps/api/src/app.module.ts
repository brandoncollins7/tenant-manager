import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { OccupantsModule } from './modules/occupants/occupants.module';
import { ChoresModule } from './modules/chores/chores.module';
import { SwapsModule } from './modules/swaps/swaps.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatsModule } from './modules/stats/stats.module';
import { UnitsModule } from './modules/units/units.module';
import { RoomsModule } from './modules/rooms/rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantsModule,
    OccupantsModule,
    ChoresModule,
    SwapsModule,
    UploadsModule,
    NotificationsModule,
    StatsModule,
    UnitsModule,
    RoomsModule,
  ],
})
export class AppModule {}
