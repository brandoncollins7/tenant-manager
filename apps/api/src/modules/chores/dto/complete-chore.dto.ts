import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CompleteChoreDto {
  @IsString()
  @IsNotEmpty()
  photoPath: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
