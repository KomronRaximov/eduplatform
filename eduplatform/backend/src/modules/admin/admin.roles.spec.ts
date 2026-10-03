import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/types/database.enums';
import { VideosAdminController } from '../videos/videos-admin.controller';
import { AdminController } from './admin.controller';

describe('AdminController roles', () => {
  it('class allows ADMIN and TEACHER', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual(expect.arrayContaining([UserRole.ADMIN, UserRole.TEACHER]));
  });
  it.each(['users', 'user', 'updateUser', 'deleteUser'])('%s is ADMIN-only', (m) => {
    expect(Reflect.getMetadata(ROLES_KEY, (AdminController.prototype as any)[m])).toEqual([UserRole.ADMIN]);
  });
  it.each(['dashboard', 'topics', 'createTopic', 'tests', 'createTest', 'createQuestion'])('%s inherits class roles', (m) => {
    expect(Reflect.getMetadata(ROLES_KEY, (AdminController.prototype as any)[m])).toBeUndefined();
  });
  it('VideosAdminController allows ADMIN and TEACHER', () => {
    expect(Reflect.getMetadata(ROLES_KEY, VideosAdminController)).toEqual(expect.arrayContaining([UserRole.ADMIN, UserRole.TEACHER]));
  });
  describe('RolesGuard', () => {
    const guard = new RolesGuard(new Reflector());
    const ctx = (handler: any, role: string) => ({ getHandler: () => handler, getClass: () => AdminController, switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) }) as unknown as ExecutionContext;
    it('rejects TEACHER on users', () => expect(guard.canActivate(ctx(AdminController.prototype.users, 'TEACHER'))).toBe(false));
    it('allows TEACHER on topics', () => expect(guard.canActivate(ctx(AdminController.prototype.topics, 'TEACHER'))).toBe(true));
    it('allows ADMIN on users', () => expect(guard.canActivate(ctx(AdminController.prototype.users, 'ADMIN'))).toBe(true));
  });
});
