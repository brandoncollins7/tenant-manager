import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { RequestType } from '@prisma/client';

export class CreateRequestDto {
  @IsEnum(RequestType)
  @IsNotEmpty()
  type: RequestType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  photoPath?: string;
}
