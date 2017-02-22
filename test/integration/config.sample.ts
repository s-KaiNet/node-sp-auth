import {
  IUserCredentials,
  IOnpremiseUserCredentials,
  IOnPremiseAddinCredentials,
  IOnlineAddinCredentials,
  IAdfsUserCredentials
} from './../../src/auth/IAuthOptions';

export var onlineUrl: string = '[sharepoint online url]';
export var onpremAdfsEnabledUrl: string = '[sharepint on premise url with adfs configured]';
export var onpremNtlmEnabledUrl: string = '[sharepint on premise url with ntlm]';
export var onpremFbaEnabledUrl: string = '[sharepint on premise url with fba auth]';

export var onlineCreds: IUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export var onlineWithAdfsCreds: IUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export var onpremCreds: IOnpremiseUserCredentials = {
  username: '[username]',
  domain: '[domain]',
  password: '[password]'
};

export var onpremFbaCreds: IOnpremiseUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export var onpremAddinOnly: IOnPremiseAddinCredentials = {
  clientId: '[clientId]',
  issuerId: '[issuerId]',
  realm: '[realm]',
  rsaPrivateKeyPath: '[rsaPrivateKeyPath]',
  shaThumbprint: '[shaThumbprint]'
};

export var onlineAddinOnly: IOnlineAddinCredentials = {
  clientId: '[clientId]',
  clientSecret: '[clientSecret]',
  realm: '[realm]'
};

export var adfsCredentials: IAdfsUserCredentials = {
  username: '[username]',
  password: '[password]',
  relyingParty: '[relying party]',
  adfsUrl: '[adfs url]'
};
