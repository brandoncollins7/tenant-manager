import { IsString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';

export class CompleteChoreDto {
  @IsString()
  @IsOptional()
  photoPath?: string; // Legacy: kept for backward compatibility

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  @IsOptional()
  photoPaths?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
