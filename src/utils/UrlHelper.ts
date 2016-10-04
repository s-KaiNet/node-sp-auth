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
}
