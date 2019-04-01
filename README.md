# node-sp-auth - nodejs to SharePoint unattended http authentication 
[![NPM](https://nodei.co/npm/node-sp-auth.png?mini=true)](https://nodei.co/npm/node-sp-auth/)
[![npm version](https://badge.fury.io/js/node-sp-auth.svg)](https://badge.fury.io/js/node-sp-auth)

### Need help on SharePoint with Node.JS? Join our gitter chat and ask question! [![Gitter chat](https://badges.gitter.im/gitterHQ/gitter.png)](https://gitter.im/sharepoint-node/Lobby)
---
> **IMPORTANT:** This module doesn't work in browser. The only supported environment is nodejs. If you have a need to use it in browser, probably you're looking for [sp-rest-proxy](https://github.com/koltyakov/sp-rest-proxy) - a nodejs proxy, which redirects calls to real SharePoint. 
---
`node-sp-auth` allows you to perform SharePoint unattended (without user interaction) http authentication with nodejs using different authentication techniques. `node-sp-auth` also takes care about caching authentication data for performance (no need for you to think about how long authentication will be available, that's a task for `node-sp-auth`, as soon as authentication will be expired, `node-sp-auth` will renew it internally).    

Versions supported:
 * SharePoint 2013 and onwards
 * SharePoint Online

Authentication options:
 * SharePoint 2013 and onwards:
   * Addin only permissions
   * User credentials through the http ntlm handshake
   * Form-based authentication (FBA)
   * Forefront TMG authentication
 * SharePoint Online:
   * Addin only permissions
   * SAML based with user credentials
 * ADFS user credentials (works with both SharePoint on-premise and Online)
 * On demand authentication. Uses interactive browser session for asking credentials. Supports third-party authentication providers for SharePoint Online and SharePoint on-premise. Doesn't support integrated windows authentication (NTLM). 

[Wiki](https://github.com/s-KaiNet/node-sp-auth/wiki) contains detailed steps you need to perform in order to use any of authentication options as well as sample using. 

---

### How to use:
#### Install:
```bash
npm install node-sp-auth --save-dev
```
#### Create authentication headers and perform http request:

```javascript
import * as spauth from 'node-sp-auth';
import * as request from 'request-promise';

//get auth options
spauth.getAuth(url, credentialOptions)
  .then(options => {

    //perform request with any http-enabled library (request-promise in a sample below):
    let headers = options.headers;
    headers['Accept'] = 'application/json;odata=verbose';

    request.get({
      url: 'https://[your tenant].sharepoint.com/sites/dev/_api/web',
      headers: headers
    }).then(response => {
      //process data
    });
  });
```

## API:
### getAuth(url, credentialOptions)
#### return value:
Promise resolving into object with following properties:
 - `headers` - http headers (normally contain `Authorization` header, may contain any other heraders as well)
 - `options` - any additional options you may need to include for succesful request. For example, in case of on premise user credentials authentication, you need to set `agent` property on corresponding http client

#### params:
 - `url` - required, string, url to SharePoint site, `https://sp2013/sites/dev/` or `https:/[your tenant].sharepoint.com/sites/dev/`
 - `credentialOptions` - optional, object in a form of key-value. Each authentication option requires predefined credential object, depending on authentication type. Based on credentials provided, `node-sp-auth` automatically determines which authentication strategy to use (strategies listed in the top of the readme file).  
 
Possible values for `credentialOptions` (depending on authentication strategy):

 - SharePoint on premise (2013, 2016):
    - [Addin only permissions:](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20on-premise%20addin%20only%20authentication)  
      `clientId`, `issuerId`, `realm`, `rsaPrivateKeyPath`, `shaThumbprint`
    - [User credentials through the http ntlm handshake:](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20on-premise%20user%20credentials%20authentication)  
      `username`, `password`, `domain`, `workstation`
    - [User credentials for form-based authentication (FBA):](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20on-premise%20FBA%20authentication)  
      `username`, `password`, `fba` = true
    - User credentials for Forefront TMG (reverse proxy):  
      `username`, `password`, `tmg` = true

 - SharePoint Online: 
   - [Addin only permissions:](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20Online%20addin%20only%20authentication)  
     `clientId`, `clientSecret`
   - [SAML based with user credentials](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20Online%20user%20credentials%20authentication)  
     `username` , `password`, `online`

 - [ADFS user credentials:](https://github.com/s-KaiNet/node-sp-auth/wiki/ADFS%20user%20credentials%20authentication)  
   `username`, `password`, `relyingParty`, `adfsUrl`, `adfsCookie`
 - [On demand authentication](https://github.com/s-KaiNet/node-sp-auth/wiki/On%20demand%20authentication)  
     `ondemand` = true, `electron`, `force`, `persist`, `ttl`  
  - no authentication - do not provide any authentication data at all, like `spauth.getAuth(url).then(...)`. In that case `node-sp-auth` will ask you for the site url and credentials. You will have to select any of the credential options listed above. Credentials will be stored in a user folder in an encrypted manner.  
  Credits: Andrew Koltyakov [@koltyakov](https://github.com/koltyakov) and his awesome [node-sp-auth-config](https://github.com/koltyakov/node-sp-auth-config)

Please, use [Wiki](https://github.com/s-KaiNet/node-sp-auth/wiki/) to see how you can configure your environment in order to use any of this authentication options.

### setup(configuration)

#### params:
 - `configuration` - object accepting some configuration values for node-sp-auth. Currently it supports only configuration of underline `request` module via providing below code (for options available consider [request repository](https://github.com/request/request#requestoptions-callback)):  
 ```typescript
 spauth.setup({
    requestOptions: {... request options object}
  });
 ```

## Development:
I recommend using VS Code for development. Repository already contains some settings for VS Code editor.

Before creating Pull Request you need to create an appropriate issue and reference it from PR.

1. `git clone https://github.com/s-KaiNet/node-sp-auth.git`
2. `npm run build` - runs linting and typescript compilation
3. `npm run dev` - setup watchers and automatically runs typescript compilation, tslint and tests when you save files

## Integration testing:
1. Rename file `/test/integration/config.sample.ts` to `config.ts`.
2. Update information in `config.ts` with appropriate values (urls, credentials).
3. Run `npm run test:integration`.
4. For tests debugging put a breakpoint and press F5 (works in VSCode only).
