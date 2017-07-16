import * as Promise from 'bluebird';
import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as _ from 'lodash';
import { Cpass } from 'cpass';

import { IAuthResolver } from '../../IAuthResolver';
import { IAuthResponse } from '../../IAuthResponse';
import { IOnDemandCredentials } from '../../IAuthOptions';
import { UrlHelper } from '../../../utils/UrlHelper';
import { Cache } from './../../../utils/Cache';

export interface ICookie {
  httpOnly: boolean;
  name: string;
  value: string;
}

export class OnDemand implements IAuthResolver {
  private static CookieCache: Cache = new Cache();
  private static Expiration = 24 * 60 * 60;
  private _cpass = new Cpass();

  constructor(private _siteUrl: string, private _authOptions: IOnDemandCredentials) {
    _.defaults(this._authOptions, {
      force: false,
      persist: true
    });
  }

  public getAuth(): Promise<IAuthResponse> {
    let dataFilePath = this.getDataFilePath();
    let cookies: ICookie[];
    let cacheKey: string = this.resolveFileName();

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
    }

    let authCookie = '';

    cookies.forEach((cookie) => {
      authCookie += `${cookie.name}=${cookie.value};`;
    });

    authCookie = authCookie.slice(0, -1);
    OnDemand.CookieCache.set(cacheKey, authCookie, OnDemand.Expiration);

    return Promise.resolve({
      headers: {
        'Cookie': authCookie
      }
    });
  }

  private saveAuthData(dataPath: string): ICookie[] {
    let isWindows = (process.platform.lastIndexOf('win') === 0);

    let command = isWindows ? 'cmd.exe' : 'sh';
    let electronExecutable = this._authOptions.electron || 'electron';
    let args = `${electronExecutable} ${path.join(__dirname, 'main.js')} ${this._siteUrl}`;
    const output = childProcess.execFileSync(command, [isWindows ? '/c' : '-c', args]).toString();

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
        }
      }
    });

    if (cookies.length === 0) {
      throw new Error('Cookie array is empy');
    }

    if (this._authOptions.persist) {
      fs.writeFileSync(dataPath, this._cpass.encode(JSON.stringify(cookies)));
    }

    return cookies;
  }

  private getDataFilePath(): string {
    let userDataFolder = this.getUserDataFolder();
    if (!fs.existsSync(userDataFolder)) {
      fs.mkdirSync(userDataFolder);
    }
    return path.join(userDataFolder, `${this.resolveFileName()}_ondemand.data`);
  }

  private getUserDataFolder(): string {
    let platform = process.platform;
    let homepath: string;

    if (platform.lastIndexOf('win') === 0) {
      homepath = process.env.APPDATA || process.env.LOCALAPPDATA;
    }

    if (platform === 'darwin') {
      homepath = process.env.homepath;
      homepath = path.join(homepath, 'Library', 'Application Support');
    }

    if (platform === 'linux') {
      homepath = process.env.homepath;
    }

    if (!homepath) {
      throw new Error('Couldn\'t find the base application data folder');
    }

    return path.join(homepath, 'spauth');
  }

  private resolveFileName(): string {
    let url = UrlHelper.removeTrailingSlash(this._siteUrl);
    return url.replace(/[\:/\s]/g, '_');
  }
}
