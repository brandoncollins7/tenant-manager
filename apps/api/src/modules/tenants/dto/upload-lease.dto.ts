import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadLeaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
