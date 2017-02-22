// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';


//Import example if you want to use 'import' syntax instead 'require' standart.
// Import our contract artifacts and turn them into usable abstractions.
import escrow_artifacts from '../../build/contracts/EscrowAdvansed.json';

// MetaCoin is our usable abstraction, which we'll use through the code below.
var EscrowAdvansed = contract(escrow_artifacts);
console.log('json');
console.log(EscrowAdvansed);


//require syntax.
// Require our contract artifacts and turn them into usable abstractions.
//var json = require("../../build/contracts/EscrowAdvansed.json");

// Turn our contract into an abstraction
//var contract = require("truffle-contract");
//var EscrowAdvansed = contract(json);
//console.log(EscrowAdvansed);
// Step 3: Provision the contract with a web3 provider
//EscrowAdvansed.setProvider(new Web3.providers.HttpProvider("http://localhost:8545"));

/**
// Step 4: Use the contract!
EscrowAdvansed.deployed().then(function(deployed) {
  return deployed.someFunction();
});
**/


// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;


var MyEscrowInstance;


window.App = {
  start: function() {
    var self = this;



    // Bootstrap the EscrowAdvansed abstraction for Use.
    //EscrowAdvansed.setProvider(web3.currentProvider);
    EscrowAdvansed.setProvider(new Web3.providers.HttpProvider("http://localhost:8545"));

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];
  //    console.log(account);

      //Here you can input some initial functions.

    });


     EscrowAdvanced.deployed().then(function(instance) {
      MyEscrowInstance=instance;
      console.log(instance.deployed_address);
      console.log(EscrowAdvanced.deployed_address);
      console.log(MyEscrowInstance);
      });


  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

 setStatusPos: function (pos, msg){
$(pos).html(msg);

},

  //Пример блока
  someFunction: function (){
    var self = this;
    var amount = $('#transfer_am').val();
    var to = $("#transfer_to").val();
  this.setStatus("Initiating transaction... (please wait)");
    alert("this work");
  }


//payload functions.






// Some example syntax ----------------------------------
/**
  refreshBalance: function() {
    var self = this;

    var meta;
    MetaCoin.deployed().then(function(instance) {
      meta = instance;
      return meta.getBalance.call(account, {from: account});
    }).then(function(value) {
      var balance_element = document.getElementById("balance");
      balance_element.innerHTML = value.valueOf();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting balance; see log.");
    });
  },

  sendCoin: function() {
    var self = this;

    var amount = parseInt(document.getElementById("amount").value);
    var receiver = document.getElementById("receiver").value;

    this.setStatus("Initiating transaction... (please wait)");

    var meta;
    MetaCoin.deployed().then(function(instance) {
      meta = instance;
      return meta.sendCoin(receiver, amount, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshBalance();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error sending coin; see log.");
    });
  }
};
**/
//---------------------------------

};



window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
