<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).


Here is the converted document in a tabular form:

| **Category**                       | **Description**                                                                                                           | **API Endpoint / Request**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **Response Example**                                                                                                                                                                                                                                                                                                    |
|------------------------------------|---------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Authentication with JWT Server** | **Step 1: Obtain Authorization Code**                                                                                     | `https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=${clientId}&scope=ZohoCRM.modules.ALL&redirect_uri=${redirectUri}`                                                                                                                                                                                                                                                                                                                                                                                                                     | N/A                                                                                                                                                                                                                                                                                                                     |
| **Step 2: Generate Auth Token**    | Use the authorization code to request the auth token and refresh token                                                    | ```sh<br>curl --location 'https://accounts.zoho.in/oauth/v2/token' \ <br>--header 'Content-Type: application/x-www-form-urlencoded' \ <br>--data-urlencode 'grant_type=authorization_code' \ <br>--data-urlencode 'client_id=1000.ADS5KVO2LFIEHN44YDHUJFJ1XZHOGV' \ <br>--data-urlencode 'client_secret=b98fb2b3b5af0d3d8086a3081a35ac01fa4d8d7cee' \ <br>--data-urlencode 'redirect_uri=https://test.com/test' \ <br>--data-urlencode 'code=1000.6e23c0e3a8989cb2184863dffe3cf984.48a83d3d105fbb5e00563d818591619e'``` | ```json<br>{<br>    "access_token": "1000.33eaf10706dde532f534aee1457118cd.3f2fe19b070d53e06c0a5b6cea0a4b75",<br>    "refresh_token": "1000.87ab956cd7215f10a09733588594ab6a.1175a1b08fa287b1c66729670ce6ca0e",<br>    "scope": "ZohoCRM.settings.territories.ALL",<br>    "api_domain": "https://www.zohoapis.in",<br>    "token_type": "Bearer",<br>    "expires_in": 3600<br>} ```                                                                                                                                  |
| **Step 3: Refresh Auth Token**     | Refresh the auth token using the following cURL command                                                                   | ```sh<br>curl --location 'https://accounts.zoho.in/oauth/v2/token' \ <br>--header 'Content-Type: application/x-www-form-urlencoded' \ <br>--data-urlencode 'grant_type=refresh_token' \ <br>--data-urlencode 'client_id=1000.ADS5KVO2LFIEHN44YDHUJFJ1XZHOGV' \ <br>--data-urlencode 'client_secret=b98fb2b3b5af0d3d8086a3081a35ac01fa4d8d7cee' \ <br>--data-urlencode 'refresh_token=1000.6e23c0e3a8989cb2184863dffe3cf984.48a83d3d105fbb5e00563d818591619e'```                | ```json<br>{<br>    "access_token": "1000.33eaf10706dde532f534aee1457118cd.3f2fe19b070d53e06c0a5b6cea0a4b75",<br>    "scope": "ZohoCRM.settings.territories.ALL",<br>    "api_domain": "https://www.zohoapis.in",<br>    "token_type": "Bearer",<br>    "expires_in": 3600<br>} ```                                                                                                                                  |
| **Check Staff Availability**       | Check the availability of staff using the following GET request                                                            | ```sh<br>curl --location --request GET 'https://www.zohoapis.com/bookings/v1/json/availableslots?service_id=3848021000000027083&staff_id=3848021000000027052&selected_date=30-Apr-2020%10:00:00'```                                                                                                                                                                                                                                                                                                                  | ```json<br>{<br>  "response": {<br>    "returnvalue": {<br>      "response": true,<br>      "data": [<br>        "10:00",<br>        "10:15",<br>        "10:30"<br>      ],<br>      "time_zone": "Asia/Calcutta"<br>    },<br>    "status": "success"<br>  }<br>}```                                                                                                                                        |
| **Service and package module**       | GET custome module                                                            | ```sh<br>curl --request GET \ --url "https://www.zohoapis.com/crm/v2/CustomModule" \ --header "Authorization: Zoho-oauthtoken ACCESS_TOKEN"'```                                                                                                                                                                                                                                                                                                                  | Depend on custom module                                                                                                                                        |
| **Coupon module**       | GET custome module                                                            | ```sh<br>curl --request GET \ --url "https://www.zohoapis.com/crm/v2/CustomModule" \ --header "Authorization: Zoho-oauthtoken ACCESS_TOKEN"'```                                                                                                                                                                                                                                                                                                                  | Depend on custom module. For validation function https://www.zoho.com/developer/help/extensions/rest-api.html                                                                                                                                        |
| **Search Seller and Buyer Agents** | Search for seller and buyer agents using the following request                                                             | ```sh<br>curl "https://www.zohoapis.com/crm/v3/coql" <br>-H "Authorization: Zoho-oauthtoken 1000.8cb99dxxxxxxxxxxxxx9be93.9b8xxxxxxxxxxxxxxxf" <br>-d "@input.json" <br>-X POST```                                                                                                                                                                                                                                                                                                                                    | N/A                                                                                                                                                                                                                                                                                                                     |
| **Input**                          | Example input for the above request                                                                                       | ```json<br>{ <br> "select_query": "select Last_Name, First_Name, Full_Name, Lead_Source, Languages_Known from Contacts where (((Last_Name = 'Boyle') and (Lead_Source = Advertisement)) and Languages_Known = 'English;German') limit 2"<br>}```                                                                                                                                                                                                                                                                      | N/A                                                                                                                                                                                                                                                                                                                     |
| **Create Deal**                    | Create a deal with services and packages using the following POST request                                                  | ```sh<br>curl "https://www.zohoapis.com/crm/v6/Leads" <br>-H "Authorization: Zoho-oauthtoken 1000.8cb99dxxxxxxxxxxxxx9be93.9b8xxxxxxxxxxxxxxxf" <br>-d "@newlead.json" <br>-X POST```                                                                                                                                                                                                                                                                                                                                 | N/A                                                                                                                                                                                                                                                                                                                     |
| **Request Body**                   | The request body will depend on the object definition                                                                      | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | N/A                                                                                                                                                                                                                                                                                                                     |
| **Send Email**                     | Send an email using the following POST request                                                                             | ```sh<br>curl "https://www.zohoapis.com/crm/v6/Leads/3652397000002181001/actions/send_mail" <br>-X POST <br>-H "Authorization: Zoho-oauthtoken 1000.8cb99dxxxxxxxxxxxxx9be93.9b8xxxxxxxxxxxxxxxf" <br>-d "@input.json"```                                                                                                                                                                                                                                                                                            | N/A                                                                                                                                                                                                                                                                                     

