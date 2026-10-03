import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }) => value === 'true' || value === true ? true : value === 'false' || value === false ? false : value;
const emptyToUndefined = ({ value }: { value: unknown }) => value === '' ? undefined : value;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const TYPES = ['YOUTUBE', 'UPLOAD'];

export class CreateVideoDto {
  @IsString() topicId: string;
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsIn(DIFFICULTIES) difficulty?: string;
  @IsIn(TYPES) type: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(500) youtubeUrl?: string;
}

export class UpdateVideoDto {
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsIn(DIFFICULTIES) difficulty?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsIn(TYPES) type?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(500) youtubeUrl?: string;
  @Transform(toBoolean) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class VideoFilterDto {
  @IsOptional() @IsString() topicId?: string;
}
