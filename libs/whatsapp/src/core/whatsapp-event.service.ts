import { WhatsappEventActionMetadataKey } from '@app/whatsapp/constants';
import type { WhatsappAction } from '@app/whatsapp/interfaces/whatsapp.interface';
import { DiscoveryService } from '@golevelup/nestjs-discovery';
import { Injectable } from '@nestjs/common';

import type { BaileysEventMap, WASocket } from '@whiskeysockets/baileys';

@Injectable()
export class WhatsappEventService {
  constructor(private readonly discoveryService: DiscoveryService) {}

  async bind(socket: WASocket) {
    const providers = await this.discoveryService.providersWithMetaAtKey(
      WhatsappEventActionMetadataKey,
    );

    const handlers: Partial<{
      [key in keyof BaileysEventMap]: WhatsappAction[];
    }> = {};

    providers.map(async (provider) => {
      const eventName = provider.meta as unknown as keyof BaileysEventMap;
      if (!handlers[eventName]) handlers[eventName] = [];

      const instance = provider.discoveredClass.instance as WhatsappAction;

      handlers[eventName].push(instance);
    });

    for (const eventName in handlers) {
      if (!handlers[eventName]) continue;
      socket.ev.on(eventName as keyof BaileysEventMap, (...args) => {
        handlers[eventName].forEach((handler: WhatsappAction) =>
          handler.execute(socket, ...args),
        );
      });
    }
  }
}
