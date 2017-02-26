# escrow-eth

Contract of escrow-eth


EscrowSimple - simple contract of eth esrow without state values.
(https://github.com/JackBekket/escrow-eth/blob/master/contracts/EscrowSimple.sol)

EscrowAdvansed
(https://github.com/JackBekket/escrow-eth/blob/master/contracts/EscrowAdvansed.sol)


default seller is accounts[0] (msg.sender), default arbiter is accounts[1], default buyer is accounts[2]
-- in demo.

#Install and deploy

1. clone this repo
```
git clone https://github.com/JackBekket/escrow-eth.git
```
2. ```npm install``` and make sure that you have truffle installed globally.
3. ```truffle migrate --reset ``` will deploy contract with some demodata defined in migration sript.
migration script can be found here:
(https://github.com/JackBekket/escrow-eth/blob/master/migrations/2_deploy_contracts.js)
4. ```npm run build ``` will build your dapp frontend with webpack builder. Make sure that you have your contract deployed.
5. You can interact with your dapp by simply open ```index.html``` from ```build``` directory after previous command.


# Contract Interaction

```
var contr = EscrowAdvansed.deployed();
```

# Truffle 2.x or standart web3 Javascript-console

  if you are using standart web3 Javascript-console or ``` truffle ver 2.x ``` you should type:

```
contr.somefunction(args);
```
like:

```
contr.start(0,'bla',1,{from: web3.eth.accounts[1], value:100});

```
or you can call variable like:

```
contr.totalEscrows.call();

```

# Truffle 3.x

Cause of new break-changes in new version of truffle (http://truffleframework.com/tutorials/upgrading-from-truffle-2-to-3#contract-abstractions-deployed-is-now-thennable)

you should use the next sintax instead of above one.:

```
contr.then(function(res){return res.somefunction(args)});

```
  like:

  ```
contr.then(function(res){return res.start(0,'bla',1,{from: web3.eth.accounts[1], value:100})});
```
and call variable like this:

```
contr.then(function(res){return res.totalEscrows.call()});
```


#NodeJS controller
All functions could be found in source file (here:https://github.com/JackBekket/escrow-eth/blob/master/app/javascripts/app.js)


#Frontend Example
source  file may be found here - (https://github.com/JackBekket/escrow-eth/blob/master/app/javascripts/app.js)
build file you can open in your browser and check how it works.

Frontend is a simple dapp which can be used for interaction with contract functions, but, however it is **not**
a complete whole dapp which can be used as standalone application.



#Features
1. All functions was tested and implemented
2. In this app ```accounts[0]``` is seller, ```accounts[1]``` is arbiter and ```accounts[2]``` is buyer.
For live version just replace all of it to ```account```.
3. lockId is global variable defined on ```window``` level of application and can be cheked and define from blockchain by any user, which allow to use it application as fully decentralized serverless application.
However, if it would use in server application - this variable should store there.
4. For now all interaction with every user and group users are connected through solidity ```events```,
which, of course, not realy good method of communication, especially because you are get all events from this contract ever been fired.
For fixing this I suggest using special handler, which will store info about 'present' deal status.
This handler must be in server side or in smart contract of hier level (like registry).
5. There might be some bugs with web3, webpack, or something else. for now working version of web3 is ^0.18.3.
version lower than will get you error with webpack build process.
6. For collect buyers data about deals with different sellers you **must** use some server-side script or higher level contract.
7. For collect arbiters data about deals with different sellers you **must** use some server-side script or higher level contracts.
8. In some actions it could be pitfall with transfering 'address' value, cause JS itself is not strong-typable language and could converse address into useless and odd number. Be careful. Probably it could be fix with ```flow.js``` plugin for babel and webpack.
9. Application contain all sections for sellers, buyers and arbiters in one for best testing suite. In live version there are probably might be 3 different applications for sellers,buyers and arbiters, or, in serverfull solutions three diferent entities. All depends on what engine and how you want to use it.

#How to build yourown frontend with custom UI?
You can use this file to create markdown:
(https://github.com/JackBekket/escrow-eth/blob/master/app/index.html)
Add your css main code here:
(https://github.com/JackBekket/escrow-eth/blob/master/app/stylesheets/app.css)
or import it from main js file here:
(https://github.com/JackBekket/escrow-eth/blob/master/app/javascripts/app.js)
#Custom UI pipeline
Also you can use any  other UI modules for frontend, which can be build with webpack.
WARN - if you will use some other builders - make sure that you understand what you are doing and that web3.js is imported properly way.
