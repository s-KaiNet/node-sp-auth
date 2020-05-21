import * as path from 'path';
import * as fs from 'fs';

import { UrlHelper } from './UrlHelper';

export class FilesHelper {

  public static getUserDataFolder(): string {
    const platform = process.platform;
    let homepath: string;

    if (platform.lastIndexOf('win') === 0) {
      homepath = process.env.APPDATA || process.env.LOCALAPPDATA;
    }

    if (platform === 'darwin') {
      homepath = process.env.HOME;
      homepath = path.join(homepath, 'Library', 'Preferences');
    }

    if (platform === 'linux') {
      homepath = process.env.HOME;
    }

    if (!homepath) {
      throw new Error('Couldn\'t find the base application data folder');
    }

    const dataPath = path.join(homepath, 'spauth');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath);
    }

    return dataPath;
  }

  public static resolveFileName(siteUrl: string): string {
    const url = FilesHelper.resolveSiteUrl(siteUrl);
    return url.replace(/[:/\s]/g, '_');
  }

  private static resolveSiteUrl(siteUrl: string): string {
    if (siteUrl.indexOf('/_') === -1 && siteUrl.indexOf('/vti_') === -1) {
      return UrlHelper.removeTrailingSlash(siteUrl);
    }

    if (siteUrl.indexOf('/_') !== -1) {
      return siteUrl.slice(0, siteUrl.indexOf('/_'));
    }

    if (siteUrl.indexOf('/vti_') !== -1) {
      return siteUrl.slice(0, siteUrl.indexOf('/vti_'));
    }

    throw new Error('Unable to resolve web site url from full request url');
  }
}
