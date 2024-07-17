import { ScanQrCodeAction } from '@app/whatsapp-action/scan-qr-code.action';
import { Module } from '@nestjs/common';
import { ConfigService } from '@services/config.service';
import { BlastAction } from './blast/blast.action';

@Module({
  providers: [ScanQrCodeAction, BlastAction, ConfigService],
})
export class WhatsappActionModule {}
