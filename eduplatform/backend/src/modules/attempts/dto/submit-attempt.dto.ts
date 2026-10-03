import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
export class SubmittedAnswerDto { @IsString() questionId: string; @IsOptional() @IsString() selectedOptionId?: string; }
export class SubmitAttemptDto { @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => SubmittedAnswerDto) answers: SubmittedAnswerDto[]; }
