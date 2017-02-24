// Import the page's CSS. Webpack will know what to do with it.
 import "../stylesheets/app.css"

// Import libraries we need.
 import { default as Web3} from 'web3'
 import { default as contract } from 'truffle-contract'


//Import example if you want to use 'import' syntax instead 'require' standart.
// Import our contract artifacts and turn them into usable abstractions.
 import escrow_artifacts from '../../build/contracts/EscrowAdvansed.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
var EscrowAdvansed = contract(escrow_artifacts);
//console.log('json');



/**
 EscrowAdvanced.deployed().then(function(instance) {
    MyEscrowInstance=instance;
    console.log(instance.deployed_address);
    console.log(EscrowAdvanced.deployed_address);
    console.log(MyEscrowInstance);
    });
**/


//var contract = require('truffle-contract');

//require syntax.
// Require our contract artifacts and turn them into usable abstractions.
//var json0 = require("./build/contracts/BasicToken.json");
//var json = require('../../build/contracts/EscrowAdvansed.json');
//var json2 = require('./contracts/EscrowAdvansed.json');
//var Web3 = require('web3');
// Turn our contract into an abstraction

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


var event;


window.App = {
  start: function() {
    var self = this;



    // Bootstrap the EscrowAdvansed abstraction for Use.
    //EscrowAdvansed.setProvider(web3.currentProvider);
    EscrowAdvansed.setProvider(web3.currentProvider);

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

    self.refreshAddress();
    self.sellerInvoice();



  },

  refreshAddress: function(){
    var self=this;
    var escr;
    var seller_addr;
    var pos;
    var msg;
    var val1;
    EscrowAdvansed.deployed().then(function(instance) {

       escr = instance;
  //     console.log(escr.address);
       return escr.seller.call()
     }).then(function(seller){
         seller_addr = seller;
    //     console.log(seller);
    //     console.log(seller_addr);
       }).then(function(){
         //Here setup values
      //   val1=accounts
      //first section
         $("#sellerarb1").val(accounts[2]);
         pos="#selleraddr1";
         msg=seller_addr;
      //   console.log(msg);
         self.setStatusPos(pos,msg);
         //second Section
         pos="#buyeraddr1";
         msg=accounts[1];
      //    msg="lool";
      //   console.log(accounts[1]);
      //   console.log(msg);
         self.setStatusPos(pos,msg);
         $("#inp2seller").val(accounts[0]);
         //Section buyer
         //Section single
         pos="#selleraddr3";
         msg=accounts[0];
         self.setStatusPos(pos,msg);
         //arbiter
         //Продавцы
         //Продавец

       }).catch(function(e) {
         console.log(e);
         self.setStatus("Error getting address; see log.");

  });

  },



  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

 setStatusPos: function (pos, msg){
$(pos).html(msg);

},

  startEscrow: function () {
    var self=this;

    //version. 0-demo, 1-live
    var ver=0;
    //in live version must be replaced to accounts[0]
    var _from=accounts[1];
    //selleraddr1
    var _to = $('#inp2seller').val();
    var val1=$('#inp2amount').val();
//    console.log(val1);
    var _amount = web3.toWei(val1);
    console.log(_amount);
    var desc=$('#inp2description').val();
//    console.log(desc);

    var escr;
    var pos;
    var msg;

    //Should get it from backend
    var lockid=1;

    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;
    return escr.start(lockid,desc,ver,{from:_from,value:_amount,gas: 3000000})
  }).then(function(status) {
      console.log("tx.status:");
      console.log(status);

       pos="#startStatus";
       msg="Started!"
       self.setStatusPos(pos,msg);
       //function that refresh current buyer deals.
    //   self.refreshBalance();
     }).catch(function(e) {
       console.log(e);
       msg="Error starting escrow, see log";
       self.setStatusPos(pos,msg);
     });

  },

  deployEscrow: function(){
    var self=this;

    var arbiter;
    var freeze;
    var fee;
    var reward;
  //  reward=0;
  //  fee=15;
    arbiter=$("#sellerarb1").val();
    freeze=$("#freezp1").val();
    fee=$("#fee1").val();
    reward=$("#rew1").val();

    EscrowAdvansed.new(arbiter,freeze,fee,reward,{from:accounts[0],gas:3000000}).then(function(instance) {

      if(!instance.address) {
           console.log("Contract transaction send: TransactionHash: " + instance.transactionHash + " waiting to be mined...");

         } else {
           console.log("Contract mined! Address: " + instance.address);
        //   console.log(contract);
         }

  //Этот адрес можно потом передавать на бекенд или куда-нибудь еще
//   console.log(instance.address);




 });
 //Функция которая должна быть вызвана после размещения нового контракта.
 event.stopWatching();
 App.start();
 App.sellerInvoice();


  },

sellerInvoice: function(){



  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;


// 1 -Start, see .sol for different status details.
    event=escr.LogEvent({eventType:1},{fromBlock: 0, toBlock: 'latest'});
  //  console.log(event);
   event.watch(function(error, result){
      if (!error)
       console.log(result);
    //    return result;
    var apnd="  Buyer Address:<p> <span id='invoiceBuyerAddr'>0x00</span> \
      Amount:<p> <span id='invoiceAmount'></span> \
      Description:<p> <span id='invoiceDescription'></span> \
      Status:<p> <span id='invoiceStatus'></span> \
      <button id='invoiceAccept' onclick=''>Accept</button><button id='invoiceReject' onclick=''>Reject</button>"
    //Here append
    $( ".sInvoice" ).append(apnd);

  });

      //Здесь можно вписать еще then и вставить действия.
  });
//myEvent.stopWatching();

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
//  App.sellerInvoice();
});
