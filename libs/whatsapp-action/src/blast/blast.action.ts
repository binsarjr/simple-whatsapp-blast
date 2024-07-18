import { PrismaService } from '@app/prisma';
import { WAEvent } from '@app/whatsapp/decorators/wa-event.decorator';
import { WhatsappAction } from '@app/whatsapp/interfaces/whatsapp.interface';
import type { BlastQueue } from '@prisma/client';
import { ConfigService } from '@services/config.service';
import { Logger } from '@services/logger';
import { delay, jidEncode, WASocket } from '@whiskeysockets/baileys';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { randomInteger } from 'src/supports/number.support';

@WAEvent('connection.update')
export class BlastAction extends WhatsappAction {
  private _timeoutId: any;
  private isOnline = false;
  private connection = 'close';
  private logger = Logger({
    name: 'BlastAction',
  });

  private currentHashGroup: string = '';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  private isReady() {
    return this.isOnline && this.connection === 'open';
  }

  async execute(event: WASocket, data: any) {
    // TODO: nanti dihapus
    // await this.prisma.blastQueue.deleteMany();

    this.logger.info('Check if connection is ready');
    if (Object.keys(data).includes('isOnline')) this.isOnline = data.isOnline;
    if (Object.keys(data).includes('connection'))
      this.connection = data.connection;

    if (this.isReady()) {
      clearTimeout(this._timeoutId);
      this._timeoutId = setTimeout(() => {
        this.logger.info('Connection is ready, ready to blast');
        this.run(event);
      }, this.config.get('config.connection_delay'));
    }
  }

  async getTargetUserPhoneNumber() {
    this.logger.info('Getting target user phone numbers');
    let phoneNumbers: string[] = [];
    for (const file of this.config.get('blast.target')) {
      const body = (await readFile(file, 'utf8')).toString().trim();
      const lines = body.split('\n');
      for (let line of lines) {
        line = line.trim();
        line = line.replace(/\s/g, '');
        line = line.replace(/\+/g, '');
        if (line.startsWith('08')) {
          line = line.replace('08', '62');
        }
        if (!/^\d*$/.test(line)) {
          throw new Error(`Invalid phone number: ${line}`);
        }

        phoneNumbers.push(line);
      }
    }

    phoneNumbers = [...new Set(phoneNumbers)];
    this.logger.info(`Target user phone numbers: ${phoneNumbers.length}`);
    return phoneNumbers;
  }

  async cleanUpBlaster() {
    // get hash group only
    const hashGroup = await this.prisma.blastQueue.findMany({
      select: {
        hashGroup: true,
      },
      distinct: ['hashGroup'],
    });

    if (hashGroup.length > 1) {
      this.logger.info('detected multiple hash groups, cleaning up');
      await this.prisma.blastQueue.deleteMany({
        where: {
          hashGroup: {
            not: this.currentHashGroup,
          },
        },
      });
    } else {
      this.logger.info('detected single hash group, skipping clean up');
    }
  }

  async registerPhoneNumberTOBlastQueue(phoneNumbers: string[]) {
    for (const phoneNumber of phoneNumbers) {
      const exists = await this.prisma.blastQueue.findMany({
        where: {
          jid: jidEncode(phoneNumber, 's.whatsapp.net'),
        },
      });

      if (exists.length > 0) {
        this.logger.info(
          `phone number ${phoneNumber} already registered to blast queue`,
        );
        continue;
      }
      await this.prisma.blastQueue.create({
        data: {
          hashGroup: this.currentHashGroup,
          jid: jidEncode(phoneNumber, 's.whatsapp.net'),
          done: false,
        },
      });
      this.logger.info(`phone number ${phoneNumber} registered to blast queue`);
    }
  }

  async run(event: WASocket) {
    this.currentHashGroup = createHash('sha512')
      .update(JSON.stringify(this.config.get('blast.content')))
      .digest('hex');
    const [targets] = await Promise.all([
      this.getTargetUserPhoneNumber(),
      this.cleanUpBlaster(),
    ]);
    await this.registerPhoneNumberTOBlastQueue(targets);

    this.infoDev(event, `Memulai blasting`);

    while (true) {
      const target = await this.prisma.blastQueue.findFirst({
        where: {
          hashGroup: this.currentHashGroup,
          done: false,
        },
      });

      if (!target) {
        await this.infoDev(event, `Blasting selesai`);

        process.exit(0);
        break;
      }

      try {
        // code action
        await this.actions(event, target);

        await this.prisma.blastQueue.update({
          where: {
            id: target.id,
          },
          data: {
            done: true,
          },
        });
      } catch (error) {
        this.logger.error(error);
        if (!(await event.onWhatsApp(target.jid))) {
          this.logger.warn(
            `Nomor ${target.jid} tidak ada di WhatsApp, melanjutkan`,
          );
          this.infoDev(
            event,
            `Nomor ${target.jid} tidak ada di WhatsApp, melanjutkan`,
          );

          await this.prisma.blastQueue.update({
            where: {
              id: target.id,
            },
            data: {
              done: true,
            },
          });
        } else {
          this.logger.info(error);
        }
      }

      await delay(
        randomInteger(
          this.config.get('config.chat.interval.min'),
          this.config.get('config.chat.interval.max'),
        ),
      );
    }
  }

  async infoDev(socket: WASocket, text: string) {
    const phoneNumberDevs = this.config.get('phone_number_dev');

    for (let phoneNumberDev of phoneNumberDevs) {
      phoneNumberDev = phoneNumberDev.toString();
      phoneNumberDev = phoneNumberDev.trim();
      phoneNumberDev = phoneNumberDev.replace(/\s/g, '');
      phoneNumberDev = phoneNumberDev.replace(/\+/g, '');
      if (phoneNumberDev.startsWith('08')) {
        phoneNumberDev = phoneNumberDev.replace('08', '62');
      }

      await socket.sendMessage(jidEncode(phoneNumberDev, 's.whatsapp.net'), {
        text,
      });
    }
  }

  async actions(socket: WASocket, target: BlastQueue) {
    for (const content of this.config.get('blast.content')) {
      const type = content.type;
      this.logger.info(`Sending ${type} message to ${target.jid}`);

      if (type === 'text') {
        await socket.sendMessage(target.jid, {
          text: content.text.trim(),
        });
      } else if (type === 'image') {
        const isUrl = content.source.startsWith('http');
        await socket.sendMessage(target.jid, {
          image: isUrl
            ? {
                url: content.source,
              }
            : readFileSync(content.source),
          caption: content?.caption?.trim() || undefined,
        });
      } else if (type === 'video') {
        const isUrl = content.source.startsWith('http');
        await socket.sendMessage(target.jid, {
          video: isUrl
            ? {
                url: content.source,
              }
            : readFileSync(content.source),
          caption: content?.caption?.trim() || undefined,
        });
      }

      this.logger.info(`Message sent to ${target.jid}`);

      await delay(
        randomInteger(
          this.config.get('config.message.interval.min'),
          this.config.get('config.message.interval.max'),
        ),
      );
    }
  }
}
