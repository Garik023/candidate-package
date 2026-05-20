import { IsOptional, IsString, IsIn } from 'class-validator';

export const VALID_STATUSES = ['pending', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled'];
export const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
