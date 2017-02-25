module.exports = function(deployer) {

// Converted to truffle 3.1 version

var EscrowAdvansed=artifacts.require("EscrowAdvansed.sol");

//deployer.deploy(EscrowSimple);
deployer.deploy(EscrowAdvansed,web3.eth.accounts[1],10,1,0);


};
