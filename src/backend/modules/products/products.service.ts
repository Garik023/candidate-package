import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { createPaginatedResponse, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async findAll(
    limit: number = 20,
    offset: number = 0,
    categoryId?: string,
  ): Promise<PaginatedResponse<Product>> {
    if (categoryId) {
      return this.findByCategory(categoryId, limit, offset);
    }

    const [data, total] = await this.productRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { id: 'ASC' },
    });

    return createPaginatedResponse(data, total, limit, offset);
  }

  private async findByCategory(
    categoryId: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResponse<Product>> {
    // Use recursive CTE to get all child categories
    const categoryQuery = `
      WITH RECURSIVE category_tree AS (
        SELECT id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT id FROM category_tree
    `;

    const categoryIds = await this.dataSource.query(categoryQuery, [categoryId]);
    const ids = categoryIds.map((c: any) => c.id);

    if (ids.length === 0) {
      return createPaginatedResponse([], 0, limit, offset);
    }

    const qb = this.productRepository.createQueryBuilder('p')
      .where('p.category_id IN (:...ids)', { ids });

    const total = await qb.getCount();

    const data = await qb
      .orderBy('p.id', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany();

    return createPaginatedResponse(data, total, limit, offset);
  }
}
