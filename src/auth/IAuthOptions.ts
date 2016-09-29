import * as url from 'url';

export interface IUrlOption {
  siteUrl: string;
}

export interface IBasicOAuthOption {
  clientId: string;
}

export interface IAppOnlyOnline extends IUrlOption, IBasicOAuthOption {
  clientSecret: string;
}

export interface IAppOnlyOnPremise extends IUrlOption, IBasicOAuthOption {
  realm: string;
  issuerId: string;
  rsaPrivateKeyPath: string;
  shaThumbprint: string;
}

export interface IUserCredentialsOnline extends IUrlOption {
  username: string;
  password: string;
}

export interface IUserCredentialsOnPremise extends IUserCredentialsOnline {
  domain?: string;
  workstation?: string;
}

export type IAuthOptions = IAppOnlyOnline | IAppOnlyOnPremise | IUserCredentialsOnline | IUserCredentialsOnPremise;

export function isAppOnlyOnline(T: IAuthOptions): T is IAppOnlyOnline {
  return (<IAppOnlyOnline>T).clientSecret !== undefined;
}

export function isAppOnlyOnpremise(T: IAuthOptions): T is IAppOnlyOnPremise {
  return (<IAppOnlyOnPremise>T).shaThumbprint !== undefined;
}

export function isUserCredentialsOnline(T: IAuthOptions): T is IUserCredentialsOnline {
  let host: string = (url.parse(T.siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (!isOnPrem && (<IUserCredentialsOnline>T).username !== undefined) {
    return true;
  }

  return false;
}

export function isUserCredentialsOnpremise(T: IAuthOptions): T is IUserCredentialsOnPremise {
  let host: string = (url.parse(T.siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (isOnPrem && (<IUserCredentialsOnline>T).username !== undefined) {
    return true;
  }

  return false;
}
