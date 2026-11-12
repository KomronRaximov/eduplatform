import { Controller, Get, Header, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/types/database.enums';
import { ResultFilterDto } from './dto/result-filter.dto';
import { ResultsService } from './results.service';

@ApiTags('Admin results') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.TEACHER) @Controller('admin/results')
export class ResultsController {
  constructor(private results: ResultsService) {}

  @Get() list(@Query() q: ResultFilterDto) { return this.results.list(q); }

  @Get('export') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename="natijalar.csv"')
  export(@Query() q: ResultFilterDto) { return this.results.exportCsv(q); }

  @Get(':id') get(@Param('id') id: string) { return this.results.get(id); }
}
