import { WAEvent } from '@app/whatsapp/decorators/wa-event.decorator';
import { WhatsappAction } from '@app/whatsapp/interfaces/whatsapp.interface';
import { WASocket } from '@whiskeysockets/baileys';

@WAEvent('connection.update')
export class BlastAction extends WhatsappAction {
  private _timeoutId: any;
  private isOnline = false;
  private connection = 'close';

  private isReady() {
    return this.isOnline && this.connection === 'open';
  }

  async execute(event: WASocket, data: any) {
    console.log(this);
    if (Object.keys(data).includes('isOnline')) this.isOnline = data.isOnline;
    if (Object.keys(data).includes('connection'))
      this.connection = data.connection;

    if (this.isReady()) {
      clearTimeout(this._timeoutId);
      this._timeoutId = setTimeout(() => {
        this.run(event);
      }, 5_000);
    }
  }

  async run(event: WASocket) {
    console.log('Blast is running');
  }
}
