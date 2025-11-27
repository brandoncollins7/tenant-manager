import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSwapRequestDto {
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  weekId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
