# node-sp-auth - nodejs to SharePoint unattended http authentication [![analytics](http://www.google-analytics.com/collect?v=1&t=pageview&tid=UA-87971440-4&cid=8ca0a7b7-186f-4010-8c15-02a66bf95cbc&dl=https%3A%2F%2Fgithub.com%2Fs-KaiNet%2Fnode-sp-auth)]()
[![NPM](https://nodei.co/npm/node-sp-auth.png?mini=true)](https://nodei.co/npm/node-sp-auth/)

[![npm version](https://badge.fury.io/js/node-sp-auth.svg)](https://badge.fury.io/js/node-sp-auth)

`node-sp-auth` allows you to perform SharePoint unattended (without user interaction) http authentication with nodejs using different authentication techniques. `node-sp-auth` also takes care about caching authentication data for performance (no need for you to think about how long authentication will be available, that's a task for `node-sp-auth`, as soon as authentication will be expired, `node-sp-auth` will renew it internally).  
Versions supported:
 * SharePoint 2013, 2016
 * SharePoint Online

Authentication options:
 * SharePoint 2013, 2016:
   * Addin only permissions
   * User credentials through the http ntlm handshake
 * SharePoint Online:
   * Addin only permissions
   * SAML based with user credentials
 * ADFS user credentials (works with both SharePoint on-premise and Online)

[Wiki](https://github.com/s-KaiNet/node-sp-auth/wiki) contains detailed steps you need to perform in order to use any of authentication options as well as sample using. 

---

### How to use:
#### Install:
```bash
npm install node-sp-auth --save-dev
```
#### Create authentication headers and perform http request:

```javascript
var spauth = require('node-sp-auth');
var request = require('request-promise');

//get auth options
spauth.getAuth(url, credentialOptions)
  .then(function(options){

    //perform request with any http-enabled library (request-promise in a sample below):
    var headers = options.headers;
    headers['Accept'] = 'application/json;odata=verbose';

    request.get({
      url: 'https://[your tenant].sharepoint.com/sites/dev/_api/web',
      headers: headers
    }).then(function(response){
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
 - `url` - string, url to SharePoint site, `https://sp2013/sites/dev/` or `https:/[your tenant].sharepoint.com/sites/dev/`
 - `credentialOptions` - object in a form of key-value. Each authentication option requires predefined credential object, depending on authentication type. Based on credentials provided, `node-sp-auth` automatically determines which authentication strategy to use (strategies listed in the top of the readme file).  
 
Possible values for `credentialOptions` (depending on authentication strategy):

 - SharePoint on premise (2013, 2016):
    - [Addin only permissions:](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20on-premise%20addin%20only%20authentication)  
      `clientId`, `issuerId`, `realm`, `rsaPrivateKeyPath`, `shaThumbprint`
    - [User credentials through the http ntlm handshake:](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20on-premise%20user%20credentials%20authentication)  
      `username`, `password`, `domain`, `workstation`  

 - SharePoint Online: 
   - [Addin only permissions:](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20Online%20addin%20only%20authentication)  
     `clientId`, `clientSecret`
   - [SAML based with user credentials](https://github.com/s-KaiNet/node-sp-auth/wiki/SharePoint%20Online%20user%20credentials%20authentication)  
     `username` , `password`
 - [ADFS user credentials:](https://github.com/s-KaiNet/node-sp-auth/wiki/ADFS%20user%20credentials%20authentication)  
   `username`, `password`, `relyingParty`, `adfsUrl`, `adfsCookie`

Please, use [Wiki](https://github.com/s-KaiNet/node-sp-auth/wiki) to see how you can configure your environment in order to use any of this authentication options.

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