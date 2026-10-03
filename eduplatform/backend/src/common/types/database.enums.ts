export const UserRole = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const VideoType = {
  YOUTUBE: 'YOUTUBE',
  UPLOAD: 'UPLOAD',
} as const;

export type VideoType = (typeof VideoType)[keyof typeof VideoType];
