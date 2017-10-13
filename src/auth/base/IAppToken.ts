export interface IAppToken {
  appctx: string;
  appctxsender: string;
  aud: string;
  exp: number;
  iat: number;
  nbf: number;
  iss: string;
  refreshtoken: string;
  realm: string;
  context: {CacheKey: string; SecurityTokenServiceUri: string};
}
