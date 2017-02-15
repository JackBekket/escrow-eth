module.exports = function(deployer) {

// Converted to truffle 3.1 version

var EscrowAdvansed=artifacts.require("EscrowAdvansed.sol");

//deployer.deploy(EscrowSimple);
deployer.deploy(EscrowAdvansed,"0x0727654eb25101e5a4485852b0f014e1231604d6","10","1","1");


};
