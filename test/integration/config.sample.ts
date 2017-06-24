import {
  IUserCredentials,
  IOnpremiseUserCredentials,
  IOnpremiseFbaCredentials,
  IOnPremiseAddinCredentials,
  IOnlineAddinCredentials,
  IAdfsUserCredentials
} from './../../src/auth/IAuthOptions';

export let onlineUrl = '[sharepoint online url]';
export let onpremAdfsEnabledUrl = '[sharepint on premise url with adfs configured]';
export let onpremNtlmEnabledUrl = '[sharepint on premise url with ntlm]';
export let onpremFbaEnabledUrl = '[sharepint on premise url with fba auth]';

export let onlineCreds: IUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export let onlineWithAdfsCreds: IUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export let onpremCreds: IOnpremiseUserCredentials = {
  username: '[username]',
  domain: '[domain]',
  password: '[password]'
};

export let onpremFbaCreds: IOnpremiseFbaCredentials = {
  username: '[username]',
  password: '[password]',
  fba: true
};

export let onpremAddinOnly: IOnPremiseAddinCredentials = {
  clientId: '[clientId]',
  issuerId: '[issuerId]',
  realm: '[realm]',
  rsaPrivateKeyPath: '[rsaPrivateKeyPath]',
  shaThumbprint: '[shaThumbprint]'
};

export let onlineAddinOnly: IOnlineAddinCredentials = {
  clientId: '[clientId]',
  clientSecret: '[clientSecret]',
  realm: '[realm]'
};

export let adfsCredentials: IAdfsUserCredentials = {
  username: '[username]',
  password: '[password]',
  relyingParty: '[relying party]',
  adfsUrl: '[adfs url]'
};
