import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ConcernStatus } from '@prisma/client';

export class UpdateConcernDto {
  @IsEnum(ConcernStatus)
  @IsOptional()
  status?: ConcernStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
