import { IsString, IsOptional } from 'class-validator';

export class ResolveRequestDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
