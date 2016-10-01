import {
  IUserCredentials,
  IOnpremiseUserCredentials,
  IOnPremiseAddinCredentials,
  IOnlineAddinCredentials
} from './../../src/auth/IAuthOptions';

export var onlineUrl: string = '[sharepoint online url]';
export var onpremUrl: string = '[sharepint on premise url]]';

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
  clientSecret: '[clientSecret]'
};
