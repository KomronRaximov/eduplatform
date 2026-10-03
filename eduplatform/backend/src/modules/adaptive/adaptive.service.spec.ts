import { Difficulty } from '../../common/types/database.enums';
import { AdaptiveService } from './adaptive.service';
describe('AdaptiveService', () => {
 const service = new AdaptiveService();
 it.each([[Difficulty.EASY, 80, Difficulty.MEDIUM], [Difficulty.EASY, 49, Difficulty.EASY], [Difficulty.MEDIUM, 80, Difficulty.HARD], [Difficulty.MEDIUM, 60, Difficulty.MEDIUM], [Difficulty.MEDIUM, 49, Difficulty.EASY], [Difficulty.HARD, 95, Difficulty.HARD], [Difficulty.HARD, 49, Difficulty.MEDIUM]])('%s with %i%% returns %s', (current, score, expected) => expect(service.getNextDifficulty(current, score)).toBe(expected));
});
