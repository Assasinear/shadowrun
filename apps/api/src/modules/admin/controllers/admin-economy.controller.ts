import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminEconomyService } from '../services/admin-economy.service';
import { AdminLogInterceptor } from '../admin-log.interceptor';
import {
  SetBalanceDto,
  DepositDto,
  CreateSubscriptionDto,
  GeneratePaymentQrDto,
} from '../dto/admin-economy.dto';

@ApiTags('Admin - Экономика')
@ApiBearerAuth()
@Controller('admin/economy')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GRIDGOD')
@UseInterceptors(AdminLogInterceptor)
export class AdminEconomyController {
  constructor(private readonly service: AdminEconomyService) {}

  @Get('wallets')
  @ApiOperation({ summary: 'Список всех кошельков' })
  @ApiQuery({ name: 'search', required: false })
  getAllWallets(@Query('search') search?: string) {
    return this.service.getAllWallets(search);
  }

  @Patch('wallets/:id/balance')
  @ApiOperation({ summary: 'Установить баланс кошелька' })
  setBalance(@Param('id') id: string, @Body() dto: SetBalanceDto) {
    return this.service.setBalance(id, dto.balance);
  }

  @Post('wallets/:id/deposit')
  @ApiOperation({ summary: 'Пополнить кошелёк' })
  deposit(@Param('id') id: string, @Body() dto: DepositDto) {
    return this.service.deposit(id, dto.amount);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Список транзакций (фильтры, пагинация)' })
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTransactions(
    @Query('walletId') walletId?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTransactions({
      walletId,
      type,
      dateFrom,
      dateTo,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('transactions/csv')
  @ApiOperation({ summary: 'Экспорт транзакций в CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="transactions.csv"')
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getTransactionsCsv(
    @Query('walletId') walletId?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getTransactionsCsv({ walletId, type, dateFrom, dateTo });
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Список всех подписок' })
  getAllSubscriptions() {
    return this.service.getAllSubscriptions();
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Создать подписку' })
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.service.createSubscription(dto);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Удалить подписку' })
  removeSubscription(@Param('id') id: string) {
    return this.service.removeSubscription(id);
  }

  @Post('qr/payment')
  @ApiOperation({ summary: 'Сгенерировать QR-код оплаты' })
  generatePaymentQr(@Body() dto: GeneratePaymentQrDto) {
    return this.service.generatePaymentQr(dto);
  }
}
