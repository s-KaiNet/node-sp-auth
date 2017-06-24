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
  return (T as IOnlineAddinCredentials).clientSecret !== undefined;
}

export function isAddinOnlyOnpremise(T: IAuthOptions): T is IOnPremiseAddinCredentials {
  return (T as IOnPremiseAddinCredentials).shaThumbprint !== undefined;
}

export function isUserCredentialsOnline(siteUrl: string, T: IAuthOptions): T is IUserCredentials {
  let host: string = (url.parse(siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (!isOnPrem && (T as IUserCredentials).username !== undefined && !isAdfsCredentials(T)) {
    return true;
  }

  return false;
}

export function isUserCredentialsOnpremise(siteUrl: string, T: IAuthOptions): T is IOnpremiseUserCredentials {
  let host: string = (url.parse(siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (isOnPrem && (T as IUserCredentials).username !== undefined && !isAdfsCredentials(T)) {
    return true;
  }

  return false;
}

export function isFbaCredentialsOnpremise(siteUrl: string, T: IAuthOptions): T is IOnpremiseFbaCredentials {
  let host: string = (url.parse(siteUrl)).host;
  let isOnPrem: boolean = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;

  if (isOnPrem && (T as IOnpremiseFbaCredentials).username !== undefined && (T as IOnpremiseFbaCredentials).fba) {
    return true;
  }

  return false;
}

export function isAdfsCredentials(T: IAuthOptions): T is IAdfsUserCredentials {
  return (T as IAdfsUserCredentials).adfsUrl !== undefined;
}
