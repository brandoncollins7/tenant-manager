import { IsString, IsOptional } from 'class-validator';

export class CompleteChoreDto {
  @IsString()
  @IsOptional()
  photoPath?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
