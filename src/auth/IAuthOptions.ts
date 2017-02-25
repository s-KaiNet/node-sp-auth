import * as url from 'url';

export interface IBasicOAuthOption {
  clientId: string;
}

export interface IOnlineAddinCredentials extends IBasicOAuthOption {
  clientSecret: string;
  realm?: string;
}

export interface IOnPremiseAddinCredentials extends IBasicOAuthOption {
  realm: string;
  issuerId: string;
  rsaPrivateKeyPath: string;
  shaThumbprint: string;
}

export interface IUserCredentials {
  username: string;
  password: string;
}

export interface IOnpremiseFbaCredentials extends IUserCredentials {
  fba: boolean;
}

export interface IOnpremiseUserCredentials extends IUserCredentials {
  domain?: string;
  workstation?: string;
}

export interface IAdfsUserCredentials extends IUserCredentials {
  domain?: string;
  adfsCookie?: string;
  adfsUrl: string;
  relyingParty: string;
}

export type IAuthOptions =
  IOnlineAddinCredentials
  | IOnPremiseAddinCredentials
  | IUserCredentials
  | IOnpremiseUserCredentials
  | IAdfsUserCredentials;

export function isAddinOnlyOnline(T: IAuthOptions): T is IOnlineAddinCredentials {
  return (<IOnlineAddinCredentials>T).clientSecret !== undefined;
}

export function isAddinOnlyOnpremise(T: IAuthOptions): T is IOnPremiseAddinCredentials {
  return (<IOnPremiseAddinCredentials>T).shaThumbprint !== undefined;
}

export function isUserCredentialsOnline(siteUrl: string, T: IAuthOptions): T is IUserCredentials {
  let host: string = (url.parse(siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (!isOnPrem && (<IUserCredentials>T).username !== undefined && !isAdfsCredentials(T)) {
    return true;
  }

  return false;
}

export function isUserCredentialsOnpremise(siteUrl: string, T: IAuthOptions): T is IOnpremiseUserCredentials {
  let host: string = (url.parse(siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (isOnPrem && (<IUserCredentials>T).username !== undefined && !isAdfsCredentials(T)) {
    return true;
  }

  return false;
}

export function isFbaCredentialsOnpremise(siteUrl: string, T: IAuthOptions): T is IOnpremiseFbaCredentials {
  let host: string = (url.parse(siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (isOnPrem && (<IOnpremiseFbaCredentials>T).username !== undefined && (<IOnpremiseFbaCredentials>T).fba) {
    return true;
  }

  /* Automatic detection then only username and password provided */
  // if (isOnPrem && (<IUserCredentials>T).username !== undefined && !isAdfsCredentials(T)) {
  //   if (
  //     ((<IOnpremiseUserCredentials>T).domain || '').length === 0
  //     && ((<IOnpremiseUserCredentials>T).workstation || '').length === 0
  //     && (<IOnpremiseUserCredentials>T).username.indexOf('@') === -1
  //   ) {
  //     return true;
  //   }
  // }

  return false;
}

export function isAdfsCredentials(T: IAuthOptions): T is IAdfsUserCredentials {
  return (<IAdfsUserCredentials>T).adfsUrl !== undefined;
}
