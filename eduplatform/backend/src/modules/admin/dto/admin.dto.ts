import { Difficulty, UserRole } from '../../../common/types/database.enums';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
export class CreateTopicDto { @IsString() name: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsBoolean() isActive?: boolean; }
export class UpdateTopicDto extends CreateTopicDto {}
export class CreateTestDto { @IsString() title: string; @IsOptional() @IsString() description?: string; @IsString() topicId: string; @IsEnum(Difficulty) difficulty: Difficulty; @IsOptional() @Type(() => Number) @IsInt() @Min(1) durationMinutes?: number; @IsOptional() @IsBoolean() isActive?: boolean; }
export class UpdateTestDto extends CreateTestDto {}
export class AnswerOptionDto { @IsString() text: string; @Type(() => Number) @IsInt() @Min(1) order: number; @IsBoolean() isCorrect: boolean; }
export class CreateQuestionDto { @IsString() text: string; @Type(() => Number) @IsInt() @Min(1) order: number; @IsOptional() @Type(() => Number) @IsInt() @Min(1) points?: number; @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true }) @Type(() => AnswerOptionDto) options: AnswerOptionDto[]; }
export class UpdateQuestionDto extends CreateQuestionDto {}
export class UserFilterDto extends PaginationDto { @IsOptional() @IsString() search?: string; @IsOptional() @IsEnum(UserRole) role?: UserRole; }
export class TestAdminFilterDto extends PaginationDto { @IsOptional() @IsString() search?: string; @IsOptional() @IsString() topicId?: string; @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty; }
export class UpdateUserDto { @IsOptional() @IsEnum(UserRole) role?: UserRole; @IsOptional() @IsEnum(Difficulty) currentDifficulty?: Difficulty; }
