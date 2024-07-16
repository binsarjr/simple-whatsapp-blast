import { ScanQrCodeAction } from '@app/whatsapp-action/scan-qr-code.action';
import { Module } from '@nestjs/common';
import { BlastAction } from './blast/blast.action';

@Module({
  providers: [ScanQrCodeAction, BlastAction],
})
export class WhatsappActionModule {}
