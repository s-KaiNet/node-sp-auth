import {
  IUserCredentials,
  IOnpremiseUserCredentials,
  IOnPremiseAddinCredentials,
  IOnlineAddinCredentials
} from './../../src/auth/IAuthOptions';

export var onlineUrl: string = '[sharepoint online url]';
export var onpremAdfsEnabledUrl: string = '[sharepint on premise url with adfs configured]';
export var onpremNtlmEnabledUrl: string = '[sharepint on premise url with ntlm]';

export var onlineCreds: IUserCredentials = {
  username: '[username]',
  password: '[password]'
};

export var onpremCreds: IOnpremiseUserCredentials = {
  username: '[username]',
  domain: '[domain]',
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
