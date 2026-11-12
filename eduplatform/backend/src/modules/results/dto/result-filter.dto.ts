import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const RESULT_STATUSES = ['PASSED', 'FAILED'] as const;
export const RESULT_KINDS = ['TEST', 'PRACTICE'] as const;

export class ResultFilterDto extends PaginationDto {
  /** O'quvchi ismi, familiyasi yoki emaili bo'yicha qidiruv */
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsString() testId?: string;
  @IsOptional() @IsIn(RESULT_STATUSES) status?: (typeof RESULT_STATUSES)[number];
  @IsOptional() @IsIn(RESULT_KINDS) kind?: (typeof RESULT_KINDS)[number];
}
