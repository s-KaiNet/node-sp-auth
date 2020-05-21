import * as url from 'url';
import { HostingEnvironment } from '../auth/HostingEnvironment';

export class UrlHelper {
  public static removeTrailingSlash(url: string): string {
    return url.replace(/(\/$)|(\\$)/, '');
  }

  public static removeLeadingSlash(url: string): string {
    return url.replace(/(^\/)|(^\\)/, '');
  }

  public static trimSlashes(url: string): string {
    return url.replace(/(^\/)|(^\\)|(\/$)|(\\$)/g, '');
  }

  public static ResolveHostingEnvironment(siteUrl: string): HostingEnvironment {
    const host: string = (url.parse(siteUrl)).host;

    if (host.indexOf('.sharepoint.com') !== -1) {
      return HostingEnvironment.Production;
    } else if (host.indexOf('.sharepoint.cn') !== -1) {
      return HostingEnvironment.China;
    } else if (host.indexOf('.sharepoint.de') !== -1) {
      return HostingEnvironment.German;
    } else if (host.indexOf('.sharepoint-mil.us') !== -1) {
      return HostingEnvironment.USDefence;
    } else if (host.indexOf('.sharepoint.us') !== -1) {
      return HostingEnvironment.USGovernment;
    }

    return HostingEnvironment.Production; // As default, for O365 Dedicated, #ToInvestigate
    // throw new Error('Unable to resolve hosting environment. Site url: ' + siteUrl);
  }
}
