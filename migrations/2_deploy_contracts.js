module.exports = function(deployer) {





//deployer.deploy(EscrowSimple);
deployer.deploy(EscrowAdvansed,web3.eth.accounts[0],10,0,0);


};
