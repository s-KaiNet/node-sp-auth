import * as Promise from 'bluebird';
import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import { Cpass } from 'cpass';
import * as url from 'url';

import { IAuthResolver } from '../../IAuthResolver';
import { IAuthResponse } from '../../IAuthResponse';
import { IOnDemandCredentials } from '../../IAuthOptions';
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
      let indx = this._siteUrl.indexOf('/_');
      this._siteUrl = this._siteUrl.substr(0, indx);
    }

    _.defaults(this._authOptions, {
      force: false,
      persist: true
    });
  }

  public getAuth(): Promise<IAuthResponse> {
    let dataFilePath = this.getDataFilePath();
    let cookies: ICookie[];
    let cacheKey: string = FilesHelper.resolveFileName(this._siteUrl);

    let cachedCookie: string = OnDemand.CookieCache.get<string>(cacheKey);

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
        let now = new Date();
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
    let host = url.parse(this._siteUrl).hostname;
    let isOnPrem = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;
    let electronExecutable = this._authOptions.electron || 'electron';
    let isWindows = (process.platform.lastIndexOf('win') === 0);
    let options: any = isWindows ? { shell: true } : undefined;
    const output = childProcess.execFileSync(electronExecutable, [path.join(__dirname, 'electron/main.js'), this._siteUrl, this._authOptions.force.toString()], options).toString();

    let cookieRegex = /#\{([\s\S]+?)\}#/gm;
    let cookieData = cookieRegex.exec(output);

    let cookiesJson = cookieData[1].split(';#;');
    let cookies: ICookie[] = [];

    cookiesJson.forEach((cookie) => {
      let data: string = cookie.replace(/(\n|\r)+/g, '').replace(/^["]+|["]+$/g, '');
      if (data) {
        let cookieData = JSON.parse(data) as ICookie;
        if (cookieData.httpOnly) {
          cookies.push(cookieData);

          // explicitly set 1 hour expiration for on-premise
          if (isOnPrem) {
            let expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + 55);
            cookieData.expirationDate = expiration.getTime() / 1000;
          } else if (!cookieData.expirationDate) { // 24 hours for online if no expiration date on cookie
            let expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + 1435);
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
    let userDataFolder = FilesHelper.getUserDataFolder();
    let ondemandFolder = path.join(userDataFolder, 'ondemand');

    if (!fs.existsSync(ondemandFolder)) {
      fs.mkdirSync(ondemandFolder);
    }
    return path.join(ondemandFolder, `${FilesHelper.resolveFileName(this._siteUrl)}.data`);
  }
}
