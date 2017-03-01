// Import the page's CSS. Webpack will know what to do with it.
// import "../stylesheets/app.css"

// Import libraries we need.
 import { default as Web3} from 'web3'
 import { default as contract } from 'truffle-contract'
 import $ from 'jquery'

//import semantic from 'semantic-ui'


//import "../../old/public/js/semantic.min.js"
// import "../../old/public/css/semantic.min.css"



import "../../semantic/dist/semantic.css"
//import "../../semantic/dist/semantic.scss"
import "../../semantic/dist/semantic.js"
//import "../../semantic/tasks/build/javascript.js"

//require ("../../semantic/tasks/build/assets.js")
//require ("../../semantic/tasks/build/css.js")
//require("../../semantic/tasks/build/javascript.js")


//import semantic from '../../node_modules/semantic-ui/'

//import "../../old/public/js/semantic.min.js"
//import semantic from '../../old/public/js/semantic.min.js'


//Import example if you want to use 'import' syntax instead 'require' standart.
// Import our contract artifacts and turn them into usable abstractions.
  import escrow_artifacts from '../../build/contracts/EscrowAdvansed.json'

 //require('../../old/public/css/themes/semantic.min.css')
// require('../../old/public/js/semantic.min.js')
//require('')

//require('semantic-ui')

//require('semantic-ui-css/semantic.css')
//require('semantic-ui-css/semantic.js')

// MetaCoin is our usable abstraction, which we'll use through the code below.
var EscrowAdvansed = contract(escrow_artifacts);
//console.log('json');


// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

var event;

//This should be get from backend!!!!!!
var global_lockid=0;

//And this one too.
//var global_status ={};

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
    self.sellerFreeze();

    self.buyerDeal();
    self.ArbSeller();
    self.logdebug();

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
    var _to = $('#inp2seller').val();
    var val1=$('#inp2amount').val();
    var _amount = web3.toWei(val1);
  //  console.log(_amount);
    var desc =$('#inp2description').val();
    var escr;
    var pos;
    var msg;


    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;
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
// App.sellerInvoice();
 //App.sellerCurrent();

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

      if(result.args.eventType.c==1){

       var descr=result.args.dataInfo;

       var lock=result.args.lockId.c;
       var lock_s=lock.join();

       var buyadr=result.args.sender;

       var amount=result.args.payment;
       var amnt=web3.fromWei(amount);

    var apnd="  <div class='sInv_in' id='sInv"+lock_s+"'> \
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

         $("div.sInv"+lockid).remove();

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
         $("div.sInv"+lockid).remove();
  },

sellerCurrent: function(){


  var lock;
  var lock_s;

  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;

// 2 -Accepted, see .sol for different status details.
    event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
  //  console.log(event);
   event.watch(function(error, result){


    if(result.args.eventType.c==2){

       var descr=result.args.dataInfo;

        lock=result.args.lockId.c;
        lock_s=lock.join();

         var buyadr=result.args.sender;
         var amount=result.args.payment;
         var amnt=web3.fromWei(amount);

      var apnd="   <div id='sCur"+lock_s+"'>  \
      <br> \
      <label for='Buyer address'>"+buyadr+" <span id='buyeraddr2'>0x0...</span> \
      <br> \
        Amount:<p> <span id='currentAmount'>"+amnt+"</span> \
        Description:<p> <span id='currentDescr'>"+descr+"</span> \
        Status:<p> <span id='currentStatus'></span> \
        <button id='sellerDone' onclick='App.currentDone("+lock_s+")'>Done</button><button id='sellerCancel' onclick='App.invoiceReject("+lock_s+")'>Cancel</button> \
        </div>  \
        ";
      //Here append
      $( ".sCurrent" ).append(apnd);
}
  });
  });
},

sellerFreeze: function(){

  var lock;
  var lock_s;

  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;

// 2 -Accepted, see .sol for different status details.
    event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
  //  console.log(event);
   event.watch(function(error, result){
      if (!error)
       console.log(result);

    if(result.args.eventType.c==12){

       var descr=result.args.dataInfo;

        lock=result.args.lockId.c;
        lock_s=lock.join();

         var buyadr=result.args.sender;
         var amount=result.args.payment;
         var amnt=web3.fromWei(amount);

      var apnd="    <div id='sFr"+lock_s+"'>   \
      <br> \
      <label for='Buyer address'>"+buyadr+" <span id='buyeraddr2'>0x0...</span> \
      <br> \
        Amount:<p> <span id='currentAmount'>"+amnt+"</span> \
        Description:<p> <span id='currentDescr'>"+descr+"</span> \
        Status:<p> <span id='currentStatus'></span> \
        <button type='button' id='buyerSubmit' onclick='App.sellerYes("+lock_s+")'>Submit</button><button type='button' id='sellerCancel' onclick='App.sellerNo("+lock_s+")'>Cancel</button> \
        </div> \
        ";
      //Here append
      $( ".sFreeze" ).append(apnd);
}
  });
  });
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
       $("div.sCur"+lockid).remove();
},

buyerDeals: function () {

},

buyerDeal: function(){


    var self=this;
    var escr;

    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;


  // 5 -Done, see .sol for different status details.
      event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
    //  console.log(event);
     event.watch(function(error, result){
      //  if (!error)
      //   console.log(result);

      if(result.args.eventType.c==5){

         var descr=result.args.dataInfo;

         var lock=result.args.lockId.c;
         var lock_s=lock.join();

         var buyadr=result.args.sender;

         var amount=result.args.payment;
         var amnt=web3.fromWei(amount);

      var apnd="   <div id='bD"+lock_s+"'>   \
      <br> \
      <label for='Buyer address'>"+buyadr+" <span id='buyeraddr2'>0x0...</span> \
      <br> \
        Amount:<p> <span id='currentAmount'>"+amnt+"</span> \
        Description:<p> <span id='currentDescr'>"+descr+"</span> \
        Status:<p> <span id='currentStatus'></span> \
        <button type='button' id='buyerSubmit' onclick='App.buyerYes("+lock_s+")'>Submit</button><button type='button' id='sellerCancel' onclick='App.buyerNo("+lock_s+")'>Cancel</button> \
        </div> \
        ";
      //Here append
      $( "#b2" ).append(apnd)
  //    {
  //      event.preventDefault();
  //    };
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
  comment = "buyerYes";

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;

     return escr.yes(lockidd,comment,ver,{from:accounts[2],gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });

       $("div.bD"+lockid).remove();
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
     return escr.no(lockidd,comment,ver,{from:accounts[2],gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });
       $("div.bD"+lockid).remove();
},


sellerYes: function (lockid) {
  var self=this;
  var escr;
  var lockidd=lockid;
//ver 0 - demo
  var ver=0;

// comment
  var comment;
  comment = "sellerYes";

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;

     return escr.yes(lockidd,comment,ver,{from:accounts[0],gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });


},

sellerNo: function (lockid) {
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
     return escr.no(lockidd,comment,ver,{from:accounts[0],gas: 3000000})
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
       seller_addr = String(seller);
       console.log("seller_addr");
       console.log(seller_addr);
     });

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
    // return escr.escrows(1)
        event=escr.LogEvent({},{fromBlock: 0, toBlock: 'latest'});
      //  console.log(event);
       event.watch(function(error, result){
// 12 - Freeze
         if(result.args.eventType.c==12){

           var descr=result.args.dataInfo;

           var lock=result.args.lockId.c;
           var lock_s=lock.join();

           var buyadr=result.args.sender;
           var amount=result.args.payment;
           var amnt=web3.fromWei(amount);


  var apnd="\
  <div id='arbiter2"+lock_s+"'>  \
  Seller: <span id='a2s"+lock_s+"'>"+seller_addr+"</span> \
  Amount:<p><span id='arbiter2Amount'>"+amnt+"</span> \
  Description:<p><span id='arbiter2Description'>"+descr+"</span> \
  Lock id:<p><span id='arbiter2Lockid'>"+lock_s+"</span> \
  Buyer:<p><span id='a2b"+lock_s+"'>"+buyadr+"</span> \
  Withdraw to:<button type='button' id='arbiter2Seller' onclick='App.arbYes("+lock_s+",1,"+amnt+")'>Seller</button><button type='button' id='arbiter2Buyer' onclick='App.arbYes("+lock_s+",2,"+amnt+")'>Buyer</button><p> \
   </div>  \
  ";
  $( ".arbiter2" ).append(apnd);
}

});
});
},

arbYes: function (lockid,choice,payment) {
  var self=this;
  var escr;
  var lockidd=lockid;
//ver 0 - demo
//console.log("lokidd");
//console.log(lockidd);
  var ver=0;
  var who;
  var selector;
  if (choice==1){
  selector="a2s"+lockidd;
  console.log("selector1");
}
  if(choice==2){
    selector="a2b"+lockidd;
    console.log("selector2");

  }
  who=$("#"+selector).html();
  var _who=who;
//  console.log("_who");
//  console.log(_who);
  var _payment=payment;
// comment
  var comment;
  comment = "Dura lex,sed lex!";

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
  //   return escr.start(lockid,desc,ver,{from:_from,value:_amount,gas: 3000000})
     return escr.arbYes(lockidd,_who,_payment,comment,ver,{from:accounts[1],gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });
       $("div.arbiter2"+lockid).remove();
},

logdebug: function () {
  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
    // return escr.escrows(1)
    // 5 -Done, see .sol for different status details.
        event=escr.LogDebug({},{fromBlock: 0, toBlock: 'latest'});
      //  console.log(event);
       event.watch(function(error, result){
         var r1=JSON.stringify(result);
         console.log(r1);
});
});
},

getFees: function () {
  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
     return escr.getFees({from:accounts[1],gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });

},

getMoney: function() {
  var self=this;
  var escr;

  EscrowAdvansed.deployed().then(function(instance) {
     escr = instance;
     return escr.getMoney({from:account,gas: 3000000})
   }).then(function(status){
       console.log("tx.accept.status");
       console.log(status);
     }).catch(function(e) {
         console.log(e);

       });

}
/**
getStatus: function (lockid) {
    var self=this;
    var escr;
    var lock=lockid;
    lock=Number(lock);
    console.log("lock");
    console.log(lock);
  //  var status;
    EscrowAdvansed.deployed().then(function(instance) {
       escr = instance;
  // 2 -Accepted, see .sol for different status details.
      event=escr.LogEvent({lockId:lock},{fromBlock: 0, toBlock: 'latest'});
    //  console.log(event);
     event.watch(function(error, result){
      //  if (!error)
      //   console.log(result);
      var status;
      status=result.args.eventType.c;
      console.log("status cycle");
      console.log(status[0]);
      global_status.lockid=status[0];
      console.log(global_status.lockid);
    });
    });
}
**/


//end of window.App
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
