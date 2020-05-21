import {
  IUserCredentials,
  IOnpremiseUserCredentials,
  IOnpremiseFbaCredentials,
  IOnPremiseAddinCredentials,
  IOnlineAddinCredentials,
  IAdfsUserCredentials
} from './../../src/auth/IAuthOptions';

export const onlineUrl = '[sharepoint online url]';
export const onpremAdfsEnabledUrl = '[sharepint on premise url with adfs configured]';
export const onpremNtlmEnabledUrl = '[sharepint on premise url with ntlm]';
export const onpremFbaEnabledUrl = '[sharepint on premise url with fba auth]';

export const onlineCreds: IUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export const onlineWithAdfsCreds: IUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export const onpremCreds: IOnpremiseUserCredentials = {
  username: '[username]',
  domain: '[domain]',
  password: '[password]'
};

export const onpremUpnCreds: IOnpremiseUserCredentials = {
  username: '[user@domain.com]',
  password: '[password]'
};

export const onpremUserWithDomainCreds: IOnpremiseUserCredentials = {
  username: '[domain\\user]',
  password: '[password]'
};

export const onpremFbaCreds: IOnpremiseFbaCredentials = {
  username: '[username]',
  password: '[password]',
  fba: true
};

export const onpremAddinOnly: IOnPremiseAddinCredentials = {
  clientId: '[clientId]',
  issuerId: '[issuerId]',
  realm: '[realm]',
  rsaPrivateKeyPath: '[rsaPrivateKeyPath]',
  shaThumbprint: '[shaThumbprint]'
};

export const onlineAddinOnly: IOnlineAddinCredentials = {
  clientId: '[clientId]',
  clientSecret: '[clientSecret]',
  realm: '[realm]'
};

export const adfsCredentials: IAdfsUserCredentials = {
  username: '[username]',
  password: '[password]',
  relyingParty: '[relying party]',
  adfsUrl: '[adfs url]'
};
