import { DiscoveryModule } from '@golevelup/nestjs-discovery';
import { Module } from '@nestjs/common';

import { PrismaModule } from '@app/prisma';
import { WhatsappActionModule } from '@app/whatsapp-action';
import { WhatsappModule } from '@app/whatsapp/whatsapp.module';
import { ConfigService } from '@services/config.service';

@Module({
  imports: [
    PrismaModule.forRoot(),
    DiscoveryModule,
    WhatsappModule.forRoot(),
    WhatsappActionModule,
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppModule {}
