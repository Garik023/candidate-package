import { Controller, Get, Param, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

class SupplierQueryDto {
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
}

@Controller('api/suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async findAll(@Query() query: SupplierQueryDto) {
    return this.suppliersService.findAll(query.limit, query.offset);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Get(':id/performance')
  async getPerformance(@Param('id') id: string) {
    return this.suppliersService.getPerformance(id);
  }
}
