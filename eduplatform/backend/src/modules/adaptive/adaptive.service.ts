import { Injectable } from '@nestjs/common';
import { Difficulty } from '../../common/types/database.enums';
@Injectable()
export class AdaptiveService {
  getNextDifficulty(current: Difficulty, percentage: number): Difficulty {
    const levels = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
    const index = levels.indexOf(current);
    if (percentage >= 80) return levels[Math.min(index + 1, levels.length - 1)];
    if (percentage < 50) return levels[Math.max(index - 1, 0)];
    return current;
  }
  recommendation(difficulty: Difficulty, percentage: number) {
    if (percentage >= 80) return `Ajoyib natija! Siz ${difficulty} darajasiga o'tishga tayyorsiz.`;
    if (percentage < 50) return `Natijani yaxshilash uchun ${difficulty} darajasidagi mavzularni qayta mustahkamlang.`;
    return `Yaxshi natija. ${difficulty} darajasida mashqni davom ettiring.`;
  }
}
