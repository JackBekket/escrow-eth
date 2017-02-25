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

//This should be get from backend!!!!!!
var global_lockid=0;
//window.lockid=0;

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
//    event.stopWatching();
    self.refreshAddress();
    self.sellerInvoice();
//    event.stopWatching();
    self.sellerCurrent();

    self.buyerDeal();



  //  console.log("window.lokid:");
  //  console.log(window.lokid);
//    self.defineLockid();
  //  console.log("window.lokid");
  //   console.log(window.lokid);


  },

  refreshAddress: function(){

    // accounts[0] - deployer,seller; 1 - arbiter, 2 - buyer.
    // this is for test only, in real application you should replace it with accounts[0] everywhere!!!

    var self=this;
    var escr;
    var seller_addr;
    var pos;
    var msg;
    var val1;
    EscrowAdvansed.deployed().then(function(instance) {

       escr = instance;

       return escr.seller.call()
     }).then(function(seller){
         seller_addr = seller;

       }).then(function(){
         //Here setup values
      //   val1=accounts
      //first section
         $("#sellerarb1").val(accounts[1]);
         pos="#selleraddr1";
         msg=seller_addr;

         self.setStatusPos(pos,msg);
         //second Section
         pos="#buyeraddr1";
         msg=accounts[2];

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

  defineLockid: function (){

    var self=this;
    var escr;
    var lockid=0;

    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;

       event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
       console.log("Event:");

     event.watch(function(error, result){
       if (!error)
        console.log(result);

     var lock=result.args.lockId.c;
     var lock_s=lock.join();
     console.log("lock_s");
     console.log(lock_s);

       if(lock_s>=global_lockid){

         global_lockid=Number(lock_s);
         console.log("global_lockid_defined");
         console.log(global_lockid);
     }

     });


     });
  },



  startEscrow: function () {
    var self=this;

    //version. 0-demo, 1-live
    var ver=0;
    //in live version must be replaced to accounts[0]
    var _from=accounts[2];
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
//    var lockid=0;

    //Should get it from backend
  //  var lockid=1;


    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;
  //     console.log(lockid);
    self.defineLockid();
    console.log("global_lockid_start");
    console.log(global_lockid);
    var lock=global_lockid;
    lock=lock+1;
    console.log("lock");
    console.log(lock);
    return escr.start(lock,desc,ver,{from:_from,value:_amount,gas: 3000000})
  }).then(function(status) {
      console.log("tx.status:");
      console.log(status);
      console.log("started!");
       pos="#startStatus";
       msg="Started!"
       self.setStatusPos(pos,msg);

    //   global_lockid=global_lockid+1;

    //   console.log(lockid);
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
  //  reward=$("#rew1").val();
  reward=0;
    EscrowAdvansed.new(arbiter,freeze,fee,reward,{from:accounts[0],gas:3000000}).then(function(instance) {

      if(!instance.address) {
           console.log("Contract transaction send: TransactionHash: " + instance.transactionHash + " waiting to be mined...");

         } else {
           console.log("Contract mined! Address: " + instance.address);
           console.log(contract);
         }

  //Этот адрес можно потом передавать на бекенд или куда-нибудь еще
//   console.log(instance.address);




 });
 //Функция которая должна быть вызвана после размещения нового контракта.
 //event.stopWatching();
 App.start();
 App.sellerInvoice();
 App.sellerCurrent();


  },

sellerInvoice: function(){



  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;

//     var dataInfo1="WoW!";
// 1 -Start, see .sol for different status details.
//-------BUG REPORTING
//Strange behavior of web3.event I can't parse specific data. That's why it will
//request whole Event and parse it after. Yes, it is not optimized, but it works for now.
//    event=escr.LogEvent({lockId:1,dataInfo:dataInfo1},{fromBlock: 0, toBlock: 'latest'});
      event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
      console.log("Event:");
    console.log(event);
   event.watch(function(error, result){
    //  if (!error)
    //   console.log(result);
    //   console.log(result.args.dataInfo);

      if(result.args.eventType.c==1){



       var descr=result.args.dataInfo;

       var lock=result.args.lockId.c;
       var lock_s=lock.join();

       var buyadr=result.args.sender;

       // c -amount, e - decimals
       //amount store in Wei format.

       var amount=result.args.payment;

       var amnt=web3.fromWei(amount);


    //    return result;
    var apnd="  <div class='sInv_in' id='"+lock_s+"'> \
    Buyer Address:<p> <span id='invoiceBuyerAddr'>"+buyadr+"</span> </br>\
      Amount:<p> <span id='invoiceAmount'>"+amnt+"</span> </br>\
      Description:<p> <span id='invoiceDescription'>"+descr+"</span></br> \
      <button id='invoiceAccept' onclick='App.invoiceAccept("+lock_s+")'>Accept</button><button id='invoiceReject' onclick='App.invoiceReject("+lock_s+")'>Reject</button> \
      </div>";
    //Here append
    $( ".sInvoice" ).append(apnd);
}

  });


  });
//myEvent.stopWatching();

},


  invoiceAccept: function (lockid) {
    var self=this;
    var escr;
    var lockidd=lockid;
//ver 0 - demo
    var ver=0;

// comment
    var comment;
    comment = "I will do it!";

    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;
    //   return escr.start(lockid,desc,ver,{from:_from,value:_amount,gas: 3000000})
       return escr.accept(lockidd,comment,ver,{from:account,gas: 3000000})
     }).then(function(status){
        // console.log("tx.accept.status");
      //   console.log(status);
       }).catch(function(e) {
           console.log(e);

         });

  },

  invoiceReject: function (lockid) {
    var self=this;
    var escr;
    var lockidd=lockid;
  //ver 0 - demo
    var ver=0;

  // comment
    var comment;
    comment = "Fuck you, I won't do what you tell me '\m/'";

    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;
    //   return escr.start(lockid,desc,ver,{from:_from,value:_amount,gas: 3000000})
       return escr.reject(lockidd,comment,ver,{from:account,gas: 3000000})
     }).then(function(status){
        // console.log("tx.accept.status");
      //   console.log(status);
       }).catch(function(e) {
           console.log(e);

         });

  },

sellerCurrent: function(){



  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;


// 2 -Accepted, see .sol for different status details.
    event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
  //  console.log(event);
   event.watch(function(error, result){
    //  if (!error)
    //   console.log(result);

    if(result.args.eventType.c==2){

       var descr=result.args.dataInfo;

       var lock=result.args.lockId.c;
       var lock_s=lock.join();

       var buyadr=result.args.sender;

       // c -amount, e - decimals
       //amount store in Wei format.

       var amount=result.args.payment;

       var amnt=web3.fromWei(amount);


    //    return result;
    var apnd="   <br> \
    <label for='Buyer address'>"+buyadr+" <span id='buyeraddr2'>0x0...</span> \
    <br> \
      Amount:<p> <span id='currentAmount'>"+amnt+"</span> \
      Description:<p> <span id='currentDescr'>"+descr+"</span> \
      Status:<p> <span id='currentStatus'></span> \
      <button id='sellerDone' onclick='App.currentDone("+lock_s+")'>Done</button><button id='sellerCancel' onclick='App.invoiceReject("+lock_s+")'>Cancel</button> \
      ";
    //Here append
    $( ".sCurrent" ).append(apnd);
}

  });


  });
//myEvent.stopWatching();

},

currentDone: function (lockid) {
  var self=this;
  var escr;
  var lockidd=lockid;
//ver 0 - demo
  var ver=0;

// comment
  var comment;
  comment = "Job's Done!";

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;

     return escr.done(lockidd,comment,ver,{from:account,gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });

},



buyerDeals: function () {

},

buyerDeal: function(){

  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
    // return escr.escrows(1)
    // 5 -Done, see .sol for different status details.
        event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
      //  console.log(event);
       event.watch(function(error, result){

         if(result.args.eventType.c==5){


           var descr=result.args.dataInfo;

           var lock=result.args.lockId.c;
           var lock_s=lock.join();

           var buyadr=result.args.sender;

           // c -amount, e - decimals
           //amount store in Wei format.

           var amount=result.args.payment;

           var amnt=web3.fromWei(amount);


  var apnd="\
  Lock id:<p> <span id='buyer2lockid'>"+lock_s+"</span> \
  Amount:<p> <span id='buyer2amount'>"+amnt+"</span> \
  Description:<p><span id='buyer2Description'>"+descr+"</span> \
  Status:<p><span id='buyer2Status'></span> \
  <p><button id='buyer2Submit' onclick='buyerYes("+lock_s+")'>Submit</button><button id='buyer2Arbiter' onclick='buyerNo("+lock_s+")'>Arbiter</button></p> \
  ";
  $( ".buyer2" ).append(apnd);
}


});
});

},

buyerYes: function (lockid) {
  var self=this;
  var escr;
  var lockidd=lockid;
//ver 0 - demo
  var ver=0;

// comment
  var comment;
  comment = "Good Job!";

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
  //   return escr.start(lockid,desc,ver,{from:_from,value:_amount,gas: 3000000})
     return escr.yes(lockidd,comment,ver,{from:account,gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });

},

buyerNo: function (lockid) {
  var self=this;
  var escr;
  var lockidd=lockid;
//ver 0 - demo
  var ver=0;

// comment
  var comment;
  comment = "It is not good :(";

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
  //   return escr.start(lockid,desc,ver,{from:_from,value:_amount,gas: 3000000})
     return escr.no(lockidd,comment,ver,{from:account,gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });

},

ArbSellers: function() {

},

ArbSeller: function() {
  var self=this;
  var escr;
  var seller_addr;
  EscrowAdvansed.deployed().then(function(instance) {

     escr = instance;

     return escr.seller.call()
   }).then(function(seller){
       seller_addr = seller;

     });

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
    // return escr.escrows(1)
    // 5 -Done, see .sol for different status details.
        event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
      //  console.log(event);
       event.watch(function(error, result){
// 12 - Freeze
         if(result.args.eventType.c==12){


           var descr=result.args.dataInfo;

           var lock=result.args.lockId.c;
           var lock_s=lock.join();

           var buyadr=result.args.sender;

           // c -amount, e - decimals
           //amount store in Wei format.

           var amount=result.args.payment;

           var amnt=web3.fromWei(amount);


  var apnd="\
  Amount:<p><span id='arbiter2Amount'>"+amnt+"</span> \
  Description:<p><span id='arbiter2Description'>"+descr+"</span> \
  Lock id:<p><span id='arbiter2Lockid'>"+lock_s+"</span> \
  Buyer:<p><span id='arbiter2Buyer'>"+buyadr+"</span> \
  Withdraw to:<button id='arbiter2Seller' onclick='App.arbYes("+lock_s+","+seller_addr+","+amnt+")'>Seller</button><button id='arbiter2Buyer' onclick='App.arbYes("+lock_s+","+buyadr+","+amnt+")'>Buyer</button><p> \
  ";
  $( ".arbiter2" ).append(apnd);
}


});
});

},

arbYes: function (lockid,who,payment) {
  var self=this;
  var escr;
  var lockidd=lockid;
//ver 0 - demo
  var ver=0;
  var _who=who;
  var _payment=payment;
// comment
  var comment;
  comment = "Dura lex,sed lex!";

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
  //   return escr.start(lockid,desc,ver,{from:_from,value:_amount,gas: 3000000})
     return escr.arbYes(lockidd,_who,_payment,comment,ver,{from:account,gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });

}




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
