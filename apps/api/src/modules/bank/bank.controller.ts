import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { BankService } from './bank.service';
import {
  TransferDto,
  PaymentRequestDto,
  ScanQrDto,
  ConfirmPaymentDto,
  NewSubscriptionDto,
} from './dto/bank.dto';

@ApiTags('Bank - Финансы и платежи')
@Controller('bank')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BankController {
  constructor(private bankService: BankService) {}

  @Get('balance')
  @ApiOperation({
    summary: 'Получить баланс кошелька',
    description: 'Возвращает текущий баланс кошелька персоны в нуйенах (¥).',
  })
  @ApiResponse({
    status: 200,
    description: 'Баланс кошелька',
    schema: { example: { balance: '1500.00' } },
  })
  async getBalance(@CurrentUser() user: CurrentUserPayload) {
    return this.bankService.getBalance(user.personaId);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Получить историю транзакций',
    description: `
Возвращает список транзакций кошелька.

**Важно:** Транзакции с \`isTheft=true\` (украденные средства) 
НЕ отображаются для обычных пользователей. Только GRIDGOD видит все транзакции.
    `,
  })
  @ApiResponse({ status: 200, description: 'Список транзакций' })
  async getTransactions(@CurrentUser() user: CurrentUserPayload) {
    return this.bankService.getTransactions(user.personaId, user.role as any);
  }

  @Post('transfer')
  @ApiOperation({
    summary: 'Перевести средства',
    description: `
Перевод нуйенов на кошелёк другой персоны или хоста.

**Ограничения:**
- Нельзя переводить при отрицательном балансе
- Нельзя переводить больше, чем есть на счету
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Перевод выполнен',
    schema: {
      example: {
        id: 'tx123',
        type: 'TRANSFER',
        amount: '100.00',
        status: 'COMPLETED',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Недостаточно средств или отрицательный баланс' })
  async transfer(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: TransferDto,
  ) {
    return this.bankService.transfer(user.personaId, dto);
  }

  @Post('payment-request')
  @ApiOperation({
    summary: 'Создать запрос на оплату',
    description: `
Создаёт запрос на оплату и QR-код для сканирования.

Получатель QR-кода может отсканировать его через \`/bank/scan-qr\` 
и подтвердить оплату через \`/bank/confirm-payment\`.

Возвращает:
- \`qrToken.token\` - текстовый токен
- \`qrToken.qrDataUrl\` - PNG картинка в base64
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Запрос на оплату создан',
  })
  async createPaymentRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PaymentRequestDto,
  ) {
    return this.bankService.createPaymentRequest(user.personaId, dto);
  }

  @Post('scan-qr')
  @ApiOperation({
    summary: 'Сканировать QR-код',
    description: `
Получает информацию о QR-коде по токену.

**Типы QR-кодов:**
- \`SIN\` - идентификация персоны
- \`PAYMENT\` - запрос на оплату
- \`DEVICE_BIND\` - привязка устройства
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о QR-коде',
    schema: {
      example: {
        type: 'PAYMENT',
        paymentRequest: {
          id: 'pr123',
          amount: '50.00',
          purpose: 'Оплата услуг',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'QR-код не найден или истёк' })
  async scanQr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ScanQrDto,
  ) {
    return this.bankService.scanQr(user.personaId, dto);
  }

  @Post('confirm-payment')
  @ApiOperation({
    summary: 'Подтвердить оплату по QR',
    description: `
Выполняет перевод средств по запросу на оплату (QR-код типа PAYMENT).

1. Сначала отсканируйте QR через \`/bank/scan-qr\`
2. Проверьте детали платежа
3. Подтвердите через этот эндпоинт
    `,
  })
  @ApiResponse({ status: 200, description: 'Платёж выполнен' })
  @ApiResponse({ status: 400, description: 'Неверный QR или недостаточно средств' })
  async confirmPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.bankService.confirmPayment(user.personaId, dto);
  }

  @Post('subscriptions/new')
  @ApiOperation({
    summary: 'Создать подписку или зарплату',
    description: `
Создаёт периодический платёж между кошельками.

**Режимы:**
- \`subscription\` - подписка (плательщик → получатель)
- \`salary\` - зарплата (работодатель → работник)

**Расчёт:**
- \`amountPerTick = floor(itemAmount * 5 / 48)\`
- Период: 1 час (3600 секунд)
- Подписка может уводить плательщика в минус!

**При отрицательном балансе:**
- Блокируются исходящие переводы
- Создаётся уведомление обеим сторонам
    `,
  })
  @ApiResponse({ status: 201, description: 'Подписка создана' })
  async createSubscription(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: NewSubscriptionDto,
  ) {
    return this.bankService.createSubscription(user.personaId, dto);
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Получить подписки',
    description: 'Возвращает список активных подписок, где персона является плательщиком или получателем.',
  })
  @ApiResponse({
    status: 200,
    description: 'Списки подписок',
    schema: {
      example: {
        asPayer: [{ id: 'sub1', amountPerTick: '50', type: 'SUBSCRIPTION' }],
        asPayee: [{ id: 'sub2', amountPerTick: '100', type: 'SALARY' }],
      },
    },
  })
  async getSubscriptions(@CurrentUser() user: CurrentUserPayload) {
    return this.bankService.getSubscriptions(user.personaId);
  }
}
