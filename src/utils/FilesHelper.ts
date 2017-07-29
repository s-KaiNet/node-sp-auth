import * as path from 'path';
import { UrlHelper } from './UrlHelper';

export class FilesHelper {

  public static getUserDataFolder(): string {
    let platform = process.platform;
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

    return path.join(homepath, 'spauth');
  }

  public static resolveFileName(siteUrl: string): string {
    let url = UrlHelper.removeTrailingSlash(siteUrl);
    return url.replace(/[\:/\s]/g, '_');
  }
}
