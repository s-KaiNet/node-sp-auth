# node-sp-auth - nodejs SharePoint unattended http authentication
[![NPM](https://nodei.co/npm/node-sp-auth.png?mini=true)](https://nodei.co/npm/node-sp-auth/)

[![npm version](https://badge.fury.io/js/node-sp-auth.svg)](https://badge.fury.io/js/node-sp-auth)

`node-sp-auth` allows you to perform SharePoint unattended http authentication with nodejs using different authentication techniques.  
Versions supported:
 * SharePoint 2013, 2016
 * SharePoint Online

Authentication options:
 * SharePoint 2013, 2016:
   * Addin only permissions
   * User credentials through the http ntlm handshake
 * SharePoint Online:
   * Addin only permissions
   * SAML based with user credentials and Microsoft Online STS (`https://login.microsoftonline.com/extSTS.srf`)  

[Wiki](https://github.com/s-KaiNet/node-sp-auth/wiki) contains detailed steps you need to perform in order to use any of authentication options. 

---

### How to use:
#### Install:
```bash
npm install node-sp-auth --save-dev
```
#### Optionally install definitions if you are developing with TypeScript:
```bash
typings install npm:node-sp-auth --save
```
#### Create authentication headers and perform http request:

```javascript
var spauth = require('node-sp-auth');
var request = require('request-promise');

//get auth options
var authOptions = spauth.getAuth(url, credentialOptions);

//perform request with any http-enabled library (request in a sample below):
authOptions
  .then(function(options){
    var headers = options.headers;
    headers['Accept'] = 'application/json;odata=verbose';

    request.get({
      url: 'https://my.sharepoint.com/sites/dev/_api/lists/getbytitle(\'Documents\')',
      headers: headers
    }).then(function(response){
      //process data
    });
  });
```

## API:
### getAuth(url, credentialOptions)
#### return value:
Promise, resolving into object with following properties:
 - `headers` - http headers (normally contain `Authorization` header, may contain any other heraders as well)
 - `options` - any additional options you may need to include for succesful request. For example, in case of on premise user credentials authentication, you need to set `agent` property on corresponding http client

#### params:
 - `url` - string, url to SharePoint site, `https://sp2013/sites/dev/` or `https:/[your tenant].sharepoint.com/sites/dev/`
 - `credentialOptions` - object in a form of key-value. Each authentication option requires predefined credential object, depending on authentication type. Based on credentials provided, `node-sp-auth` automatically determines which authentication strategy to use (strategies listed in the top of the readme file).  
 
 Possible values for `credentialOptions` (depending on authentication strategy):

 - SharePoint on premise (2013, 2016):
    - Addin only permissions:
      - `clientId` - required string, client id obtained when registering the addin
      - `issuerId` - required string, issuer id you provided when registering the addin
      - `realm` - required string, actually this is your farm id, you can get realm by running `Get-SPFarm | Select Id` or `Get-SPAuthenticationRealm`, value will be the same
      - `rsaPrivateKeyPath` - required string, path to your private part of .pfx certificate you created when registering the addin
      - `shaThumbprint` - required string, sha thumbprint of the .pfs certificate
    - User credentials through the http ntlm handshake:
      - `username` - required string, username
      - `password` - required string, password
      - `domain` - optional string, domain. Be aware, that either domain or workstation should be provided
      - `workstation` - optional string, workstation. Be aware, that either domain or workstation should be provided
 - SharePoint Online: 
   - Addin only permissions:
     - `clientId` - required string, client id obtained when registering the addin
     - `clientSecret` - required string, client secret obtained when registering the addin
   - SAML based with user credentials
     - `username` - required string, username, for example `[your user]@[your company].onmicrosoft.com`
     - `password` - required string, password

Please, use [Wiki](https://github.com/s-KaiNet/node-sp-auth/wiki) to read about how you can configure your environment in order to use any of aforementioned authentication options.

## Examples

### Create auth using SharePoint online credentials and perform get request (TypeScript):
```typescript
import * as request from 'request-promise';
import * as _ from 'lodash';
import { IncomingMessage } from 'http';
import * as spauth from 'node-sp-auth';

spauth.getAuth('https://myorg.sharepoint.com/sites/dev/', {
  clientId: '28bd7e56-8c3a-487d-bbfb-ef1a74539cbe',
  clientSecret: 'your secret'
  /* if you need, for example, SharePoint on premise auth with credentials, you will write: 
  username: 'administrator',
  domain: 'sp',
  password: 'pass'
  */
})
.then(response => {
  let options: request.OptionsWithUrl = {<request.OptionsWithUrl>getDefaultHeaders()};
  _.assign(options.headers, response.headers);
  _.assign(options, response.options);
  options.url = `${test.url}_api/web/lists/getbytitle('${documentTitle}')`;

  return request.get(options);
})
.then((data: IncomingMessage) => {
  expect((<any>data).body.d.Title).to.equal(documentTitle);
})
```
A bit more examples you can find under [integration tests](/test/integration/integration.spec.ts)

## Development:
I recommend using VS Code for development. Repository already contains some settings for VS Code editor.

Before creating Pull Request you need to create an appropriate issue and reference it from PR.

1. `git clone https://github.com/s-KaiNet/node-sp-auth.git`
2. `npm run build` - restores dependencies and runs typescript compilation
3. `gulp live-dev` - setup watchers and automatically runs typescript compilation, tslint and tests when you save files

## Integration testing:
1. Rename file `/test/integration/config.sample.ts` to `config.ts`.
2. Update information in `config.ts` with appropriate values (urls, credentials).
3. Run `gulp test-int`.