import { Difficulty } from '../../../common/types/database.enums';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
export class TestFilterDto { @IsOptional() @IsString() topicId?: string; @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty; @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean; }
