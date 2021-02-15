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
  online?: boolean;
}

export interface IOnpremiseTmgCredentials extends IUserCredentials {
  tmg: boolean;
}

export interface IOnpremiseFbaCredentials extends IUserCredentials {
  fba: boolean;
}

export interface IOnpremiseUserCredentials extends IUserCredentials {
  domain?: string;
  workstation?: string;
  rejectUnauthorized?: boolean;
}

export interface IAdfsUserCredentials extends IUserCredentials {
  domain?: string;
  adfsCookie?: string;
  adfsUrl: string;
  relyingParty: string;
}

export interface IOnDemandCredentials {
  ondemand: boolean;
  electron?: string;
  force?: boolean;
  persist?: boolean;
  ttl?: number; // session TTL in minutes
}

export type IAuthOptions =
  IOnlineAddinCredentials
  | IOnPremiseAddinCredentials
  | IUserCredentials
  | IOnpremiseUserCredentials
  | IAdfsUserCredentials
  | IOnDemandCredentials;

export function isOnPremUrl(siteUrl: string): boolean {
  const host: string = (url.parse(siteUrl)).host;
  return host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1 && host.indexOf('.sharepoint.de') === -1
    && host.indexOf('.sharepoint-mil.us') === -1 && host.indexOf('.sharepoint.us') === -1;
}

export function isAddinOnlyOnline(T: IAuthOptions): T is IOnlineAddinCredentials {
  return (T as IOnlineAddinCredentials).clientSecret !== undefined;
}

export function isAddinOnlyOnpremise(T: IAuthOptions): T is IOnPremiseAddinCredentials {
  return (T as IOnPremiseAddinCredentials).shaThumbprint !== undefined;
}

export function isUserCredentialsOnline(siteUrl: string, T: IAuthOptions): T is IUserCredentials {
  if ((T as IUserCredentials).online) {
    return true;
  }

  const isOnPrem: boolean = isOnPremUrl(siteUrl);

  if (!isOnPrem && (T as IUserCredentials).username !== undefined && !isAdfsCredentials(T)) {
    return true;
  }

  return false;
}

export function isUserCredentialsOnpremise(siteUrl: string, T: IAuthOptions): T is IOnpremiseUserCredentials {
  if ((T as IUserCredentials).online) {
    return false;
  }

  const isOnPrem: boolean = isOnPremUrl(siteUrl);

  if (isOnPrem && (T as IUserCredentials).username !== undefined && !isAdfsCredentials(T)) {
    return true;
  }

  return false;
}

export function isTmgCredentialsOnpremise(siteUrl: string, T: IAuthOptions): T is IOnpremiseTmgCredentials {
  const isOnPrem: boolean = isOnPremUrl(siteUrl);

  if (isOnPrem && (T as IOnpremiseFbaCredentials).username !== undefined && (T as IOnpremiseTmgCredentials).tmg) {
    return true;
  }

  return false;
}

export function isFbaCredentialsOnpremise(siteUrl: string, T: IAuthOptions): T is IOnpremiseFbaCredentials {
  const isOnPrem: boolean = isOnPremUrl(siteUrl);

  if (isOnPrem && (T as IOnpremiseFbaCredentials).username !== undefined && (T as IOnpremiseFbaCredentials).fba) {
    return true;
  }

  return false;
}

export function isAdfsCredentials(T: IAuthOptions): T is IAdfsUserCredentials {
  return (T as IAdfsUserCredentials).adfsUrl !== undefined;
}

export function isOndemandCredentials(T: IAuthOptions): T is IOnDemandCredentials {
  return (T as IOnDemandCredentials).ondemand !== undefined;
}
