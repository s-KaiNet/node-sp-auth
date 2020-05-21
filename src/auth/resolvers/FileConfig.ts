import * as fs from 'fs';
import * as path from 'path';

import { AuthConfig } from 'node-sp-auth-config';
import { IAuthResolver } from '../IAuthResolver';
import { IAuthResponse } from '../IAuthResponse';
import { FilesHelper } from '../../utils/FilesHelper';
import { AuthResolverFactory } from './../AuthResolverFactory';
import { Cache } from './../../utils/Cache';
import { IAuthOptions } from '../IAuthOptions';

export class FileConfig implements IAuthResolver {
  private static CredsCache: Cache = new Cache();

  constructor(private _siteUrl: string) { }

  public getAuth(): Promise<IAuthResponse> {
    const fileNameTemplate = FilesHelper.resolveFileName(this._siteUrl);

    const cachedCreds = FileConfig.CredsCache.get<IAuthOptions>(fileNameTemplate);

    if (cachedCreds) {
      return AuthResolverFactory.resolve(this._siteUrl, cachedCreds).getAuth();
    }

    const userDataFolder = FilesHelper.getUserDataFolder();
    const credsFolder = path.join(userDataFolder, 'creds');

    if (!fs.existsSync(credsFolder)) {
      fs.mkdirSync(credsFolder);
    }

    const fileNames = fs.readdirSync(credsFolder).map(name => {
      return path.basename(name, path.extname(name));
    });

    let configPath = this.findBestMatch(fileNameTemplate, fileNames);

    if (!configPath) {
      configPath = path.join(credsFolder, `${fileNameTemplate}.json`);
    } else {
      configPath = path.join(credsFolder, `${configPath}.json`);
      console.log(`[node-sp-auth]: reading auth data from ${configPath}`);
    }

    const config = new AuthConfig({
      configPath: configPath,
      encryptPassword: true,
      saveConfigOnDisk: true
    });

    return Promise.resolve(config.getContext())
      .then(context => {
        const fileNameTemplate = FilesHelper.resolveFileName(context.siteUrl);
        const fileNameWithoutExt = path.basename(configPath, path.extname(configPath));

        if (fileNameWithoutExt !== fileNameTemplate) {
          const fileName = path.basename(configPath);
          const newPath = configPath.replace(fileName, `${fileNameTemplate}.json`);
          fs.renameSync(configPath, newPath);
        }

        return context.authOptions;
      })
      .then(authOptions => {
        FileConfig.CredsCache.set(fileNameTemplate, authOptions);
        return AuthResolverFactory.resolve(this._siteUrl, authOptions).getAuth();
      });
  }

  private findBestMatch(fileNameTemplate: string, fileNames: string[]): string {
    let matchLength = 2048;
    let matchFileName: string = null;

    fileNames.forEach(fileName => {
      if (fileNameTemplate.indexOf(fileName) !== -1) {
        const subUrlLength = fileNameTemplate.replace(fileName, '').length;
        if (subUrlLength < matchLength) {
          matchLength = subUrlLength;
          matchFileName = fileName;
        }
      }
    });

    return matchFileName;
  }
}
