import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Cpass } from 'cpass';

import { IAuthResolver } from '../../IAuthResolver';
import { IAuthResponse } from '../../IAuthResponse';
import { IOnDemandCredentials, isOnPremUrl } from '../../IAuthOptions';
import { Cache } from './../../../utils/Cache';
import { FilesHelper } from '../../../utils/FilesHelper';

export interface ICookie {
  httpOnly: boolean;
  name: string;
  value: string;
  expirationDate?: number;
}

export class OnDemand implements IAuthResolver {
  private static CookieCache: Cache = new Cache();
  private _cpass = new Cpass();

  constructor(private _siteUrl: string, private _authOptions: IOnDemandCredentials) {
    // probably we are trying to get auth data using url http://site/_api/web/etc
    // which will never work for on-demand option, so strip the url to just http://site
    // that a case for spsave or sp-request
    if (this._siteUrl.indexOf('/_') !== -1) {
      const indx = this._siteUrl.indexOf('/_');
      this._siteUrl = this._siteUrl.substr(0, indx);
    }

    this._authOptions = Object.assign({
      force: false,
      persist: true
    }, this._authOptions);
  }

  public getAuth(): Promise<IAuthResponse> {
    const dataFilePath = this.getDataFilePath();
    let cookies: ICookie[];
    const cacheKey: string = FilesHelper.resolveFileName(this._siteUrl);

    const cachedCookie: string = OnDemand.CookieCache.get<string>(cacheKey);

    if (cachedCookie) {
      return Promise.resolve({
        headers: {
          'Cookie': cachedCookie
        }
      });
    }

    if (!fs.existsSync(dataFilePath) || this._authOptions.force) {
      cookies = this.saveAuthData(dataFilePath);
    } else {
      console.log(`[node-sp-auth]: reading auth data from ${dataFilePath}`);

      cookies = JSON.parse(this._cpass.decode(fs.readFileSync(dataFilePath).toString()));
      let expired = false;
      cookies.forEach((cookie) => {
        const now = new Date();
        if (cookie.expirationDate && new Date(cookie.expirationDate * 1000) < now) {
          expired = true;
        }
      });

      if (expired) {
        cookies = this.saveAuthData(dataFilePath);
      }
    }

    let authCookie = '';

    cookies.forEach((cookie) => {
      authCookie += `${cookie.name}=${cookie.value};`;
    });

    authCookie = authCookie.slice(0, -1);
    OnDemand.CookieCache.set(cacheKey, authCookie, this.getMaxExpiration(cookies));

    return Promise.resolve({
      headers: {
        'Cookie': authCookie
      }
    });
  }

  private getMaxExpiration(cookies: ICookie[]): Date {
    let expiration = 0;
    cookies.forEach(cookie => {
      if (cookie.expirationDate > expiration) {
        expiration = cookie.expirationDate * 1000;
      }
    });

    return new Date(expiration);
  }

  private saveAuthData(dataPath: string): ICookie[] {

    const electronExecutable = this._authOptions.electron || 'electron';
    const electronProc = childProcess.spawnSync(
      electronExecutable,
      [
        path.join(__dirname, 'electron/main.js'),
        '--',
        this._siteUrl,
        this._authOptions.force === true ? 'true' : 'false'
      ]
    );
    const output = electronProc.stdout.toString();

    const cookieRegex = /#\{([\s\S]+?)\}#/gm;
    const cookieData = cookieRegex.exec(output);

    const cookiesJson = cookieData[1].split(';#;');
    const cookies: ICookie[] = [];

    cookiesJson.forEach((cookie) => {
      const data: string = cookie.replace(/(\n|\r)+/g, '').replace(/^["]+|["]+$/g, '');
      if (data) {
        const cookieData = JSON.parse(data) as ICookie;
        if (cookieData.httpOnly) {
          cookies.push(cookieData);

          // explicitly set 1 hour expiration for on-premise
          if (isOnPremUrl(this._siteUrl)) {
            const expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + (this._authOptions.ttl || 55));
            cookieData.expirationDate = expiration.getTime() / 1000;
          } else if (!cookieData.expirationDate) { // 24 hours for online if no expiration date on cookie
            const expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + (this._authOptions.ttl || 1435));
            cookieData.expirationDate = expiration.getTime() / 1000;
          }
        }
      }
    });

    if (cookies.length === 0) {
      throw new Error('Cookie array is empty');
    }

    if (this._authOptions.persist) {
      fs.writeFileSync(dataPath, this._cpass.encode(JSON.stringify(cookies)));
    }

    return cookies;
  }

  private getDataFilePath(): string {
    const userDataFolder = FilesHelper.getUserDataFolder();
    const ondemandFolder = path.join(userDataFolder, 'ondemand');

    if (!fs.existsSync(ondemandFolder)) {
      fs.mkdirSync(ondemandFolder);
    }
    return path.join(ondemandFolder, `${FilesHelper.resolveFileName(this._siteUrl)}.data`);
  }
}
