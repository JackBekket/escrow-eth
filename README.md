# escrow-eth

Contract of escrow-eth


EscrowSimple - simple contract of eth esrow without state values.
(https://github.com/JackBekket/escrow-eth/blob/master/contracts/EscrowSimple.sol)

EscrowAdvansed
(https://github.com/JackBekket/escrow-eth/blob/master/contracts/EscrowAdvansed.sol)

15.02 - project updated to truffle standart ver 3.x
CHANGELOG:
-contracts binary updated to json instead of sol.js
-config upd - network definition
-migration script upd.
-other minor fixes.


USAGE

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
