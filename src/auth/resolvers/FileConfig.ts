import * as Promise from 'bluebird';

import { AuthConfig } from 'node-sp-auth-config';
import { IAuthResolver } from '../IAuthResolver';
import { IAuthResponse } from '../IAuthResponse';
import { FilesHelper } from '../../utils/FilesHelper';
import { AuthResolverFactory } from './../AuthResolverFactory';

export class FileConfig implements IAuthResolver {

  constructor(private _siteUrl: string) { }

  public getAuth(): Promise<IAuthResponse> {
    let config = new AuthConfig({
      configPath: this.getFilePath(),
      encryptPassword: true,
      saveConfigOnDisk: true
    });

    return config.getContext()
      .then(context => {
        return context.authOptions;
      })
      .then(authOptions => {
        return AuthResolverFactory.resolve(this._siteUrl, authOptions).getAuth();
      }) as any;
  }

  private getFilePath(): string {
    return null;
  }
}
