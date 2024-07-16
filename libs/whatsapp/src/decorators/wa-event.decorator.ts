import { WhatsappEventActionMetadataKey } from '@app/whatsapp/constants';
import type { BaileysEventMap } from '@whiskeysockets/baileys';
import { applyClassMetadata } from 'src/supports/decorator.support';

export const WAEvent = (eventName: keyof BaileysEventMap) =>
  applyClassMetadata(eventName, WhatsappEventActionMetadataKey);
