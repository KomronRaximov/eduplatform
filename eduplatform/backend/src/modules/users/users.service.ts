import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async me(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, email: true, role: true, currentDifficulty: true, createdAt: true } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }
}
