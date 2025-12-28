import { logger, utils } from '@certd/basic';
import { UserSuiteService } from '@certd/commercial-core';
import { Autoload, Init, Inject, Scope, ScopeEnum } from '@midwayjs/core';

@Autoload()
@Scope(ScopeEnum.Singleton, { allowDowngrade: true })
export class AutoDMitterRegister {
  @Inject()
  userSuiteService: UserSuiteService;

  @Init()
  async init() {
    await this.registerOnNewUser();
  }
  async registerOnNewUser() {
    utils.mitter.on('register', async (req: { userId: number }) => {
      logger.info('register event', req.userId);
      await this.userSuiteService.presentGiftSuite(req.userId);
    });
  }
}
