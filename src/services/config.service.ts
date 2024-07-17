import { Injectable, type OnModuleInit } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { getValueFromObject } from 'src/supports/object.support';
import { parse } from 'yaml';

@Injectable()
export class ConfigService implements OnModuleInit {
  private config: { [key: string]: any } = {};
  async onModuleInit() {
    const content = (await readFile('config.yaml', 'utf8')).toString();
    this.config = parse(content);
  }

  get(key: string) {
    return getValueFromObject(this.config, key);
  }
}
