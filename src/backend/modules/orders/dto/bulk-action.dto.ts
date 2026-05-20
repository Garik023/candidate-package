import { IsArray, IsString, ArrayMinSize, ArrayMaxSize, IsOptional } from 'class-validator';

export class BulkActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @IsString({ each: true })
  orderIds: string[];

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkActionSnakeCaseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @IsString({ each: true })
  order_ids: string[];

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
