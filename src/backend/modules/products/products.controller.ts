import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString } from 'class-validator';

class ProductQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 20)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 0)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  category?: string;
}

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query.limit, query.offset, query.category);
  }
}
