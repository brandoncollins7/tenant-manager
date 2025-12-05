import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ConcernType, ConcernSeverity } from '@prisma/client';

export class CreateConcernDto {
  @IsUUID()
  @IsNotEmpty()
  reportedId: string;

  @IsEnum(ConcernType)
  @IsNotEmpty()
  type: ConcernType;

  @IsEnum(ConcernSeverity)
  @IsOptional()
  severity?: ConcernSeverity;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  photoPath?: string;
}
