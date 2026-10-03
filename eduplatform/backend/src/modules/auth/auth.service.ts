import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}
  private safeUser(user: { id: string; firstName: string; lastName: string; email: string; role: any; currentDifficulty: any; createdAt?: Date }) {
    return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, currentDifficulty: user.currentDifficulty, createdAt: user.createdAt };
  }
  private issue(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, firstName: user.firstName };
    return { accessToken: this.jwt.sign(payload), user: this.safeUser(user) };
  }
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Bu email allaqachon ro‘yxatdan o‘tgan');
    const user = await this.prisma.user.create({ data: { firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), email, passwordHash: await bcrypt.hash(dto.password, 12) } });
    return this.issue(user);
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    return this.issue(user);
  }
  async me(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException();
    return this.safeUser(user);
  }
}
