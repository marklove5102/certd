import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { BaseService, BaseSettings } from "@certd/lib-server";
import { UserSettingsEntity } from "../entity/user-settings.js";
import { LocalCache, mergeUtils } from "@certd/basic";
const {merge} = mergeUtils

const UserSettingCache = new LocalCache({
  clearInterval: 5 * 60 * 1000,
});

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton, { allowDowngrade: true })
export class UserSettingsService extends BaseService<UserSettingsEntity> {
  @InjectEntityModel(UserSettingsEntity)
  repository: Repository<UserSettingsEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async getById(id: any): Promise<UserSettingsEntity | null> {
    const entity = await this.info(id);
    if (!entity) {
      return null;
    }
    // const access = accessRegistry.get(entity.type);
    const setting = JSON.parse(entity.setting);
    return {
      id: entity.id,
      ...setting
    };
  }

  async getByKey(key: string, userId: number): Promise<UserSettingsEntity | null> {
    if(!userId){
      throw new Error('userId is required');
    }
    if (!key || !userId) {
      return null;
    }
    return await this.repository.findOne({
      where: {
        key,
        userId
      }
    });
  }

  async getSettingByKey(key: string, userId: number): Promise<any | null> {
    if(!userId){
      throw new Error('userId is required');
    }
    const entity = await this.getByKey(key, userId);
    if (!entity) {
      return null;
    }
    return JSON.parse(entity.setting);
  }

  async save(bean: UserSettingsEntity) {
    const entity = await this.repository.findOne({
      where: {
        key: bean.key,
        userId: bean.userId
      }
    });
    if (entity) {
      entity.setting = bean.setting;
      await this.repository.save(entity);
    } else {
      bean.title = bean.key;
      await this.repository.save(bean);
    }
  }


  async getSetting<T>( userId: number,type: any, cache:boolean = false): Promise<T> {
    if(!userId){
      throw new Error('userId is required');
    }
    const key = type.__key__;
    const cacheKey = key + '_' + userId;
    if (cache) {
      const settings: T = UserSettingCache.get(cacheKey);
      if (settings) {
        return settings;
      }
    }

    let newSetting: T = new type();
    const savedSettings = await this.getSettingByKey(key, userId);
    newSetting = merge(newSetting, savedSettings);

    if (cache) {
      UserSettingCache.set(cacheKey, newSetting);
    }
    return newSetting;
  }

  async saveSetting<T extends BaseSettings>(userId:number,bean: T) {
    if(!userId){
      throw new Error('userId is required');
    }
    const old = await this.getSetting(userId,bean.constructor)
    bean = merge(old,bean)

    const type: any = bean.constructor;
    const key = type.__key__;
    if(!key){
      throw new Error(`${type.name} must have __key__`);
    }
    const entity = await this.getByKey(key,userId);
    const newEntity = new UserSettingsEntity();
    if (entity) {
      newEntity.id = entity.id;
    }else{
      newEntity.key = key;
      newEntity.title = type.__title__;
      newEntity.userId = userId;
    }
    newEntity.setting = JSON.stringify(bean);
    await this.repository.save(newEntity);
  }

}
