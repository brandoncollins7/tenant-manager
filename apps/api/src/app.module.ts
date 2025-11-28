import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminsModule } from './modules/admins/admins.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { OccupantsModule } from './modules/occupants/occupants.module';
import { ChoresModule } from './modules/chores/chores.module';
import { SwapsModule } from './modules/swaps/swaps.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatsModule } from './modules/stats/stats.module';
import { UnitsModule } from './modules/units/units.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { RequestsModule } from './modules/requests/requests.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'web', 'dist'),
      exclude: ['/api*'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AdminsModule,
    TenantsModule,
    OccupantsModule,
    ChoresModule,
    SwapsModule,
    UploadsModule,
    NotificationsModule,
    StatsModule,
    UnitsModule,
    RoomsModule,
    RequestsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
