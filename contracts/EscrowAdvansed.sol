pragma solidity ^0.4.2;


/**
/// @author SergeyPonomarev(JackBekket)

seller = deployer of contract, executor of DEAL
buyer = user of contract, initiator of DEAL.
logic - seller sell something (e.g some service), buyer is ready to buy.




**/

contract EscrowAdvansed {


  // Info about specific EscrowCase (STATE MASSIVE)
  struct EscrowInfo {

      address buyer;
      uint lockedFunds;
      uint frozenFunds;
      uint64 frozenTime;
      bool buyerNo;
      bool sellerNo;
  }


  uint constant arbitrationPeriod = 30 days;
  uint constant safeGas = 25000;

  //enum EventTypes
  uint16 constant internal Start = 1;
  uint16 constant internal Accept = 2;
  uint16 constant internal Reject = 3;
  uint16 constant internal Done = 5;
  uint16 constant internal Cancel = 4;
  uint16 constant internal Description = 10;
  uint16 constant internal Unlock = 11;
  uint16 constant internal Freeze = 12;
  uint16 constant internal Resolved = 13;



  //seller/owner of the contract
  address public seller;

//ECROW RELATED-----------------------------------------------------------------

  address public arbiter;

//TIMELOCK
  uint public freezePeriod;

  //each lock fee in promilles.
  uint public feePromille;

  //reward in promilles. promille = percent * 10, eg 1,5% reward = 15 rewardPromille
  uint public rewardPromille;

  uint public feeFunds;
  uint public totalEscrows;

  mapping (uint => EscrowInfo) public escrows;

//DEAL RELATED-------------------------------------

//enum DealStatus
uint16 constant internal None = 0;
uint16 constant internal Available = 1;
uint16 constant internal Canceled = 2;


  //status of the deals  - probably deprecate it
  uint16 public status;


//---------------------------------------------


  // array of buyers.
  mapping (address => bool) public buyers;

  // изолятор ячейки
  bool private atomicLock;

//EVENTS-----------------------------------------------------------------------------

  //event counters
  uint public contentCount = 0;
  uint public logsCount = 0;

  event LogDebug(string message);
  //TODO -clean version after job done.
  event LogEvent(uint indexed lockId, string dataInfo, uint indexed version, uint16 eventType, address indexed sender, uint payment);
//------------------------------------------------


//--MODIFIERS---------------------------
  modifier onlyOwner {
      if (msg.sender != seller)
        throw;
      _;
  }

  modifier onlyArbiter {
      if (msg.sender != arbiter)
        throw;
      _;
  }
//---------------------------------------

  //modules


function EscrowAdvansed(address _arbiter, uint _freezePeriod, uint _feePromille, uint _rewardPromille){

      seller = msg.sender;



      // all variables are always initialized to 0, save gas


//ESCROW RELATED--------------

      arbiter = _arbiter;
      freezePeriod = _freezePeriod;
      feePromille = _feePromille;
      rewardPromille = _rewardPromille;

//-----------------------------------------

//deal related --just some thoughts

      status = Available;

//-----------------------------------

    //end of constructor
  }
//----------------------------------------


// CONTRACT FUNCTIONS

// - for destruction contract.
  function kill() onlyOwner {

      //do not allow killing contract with active escrows
      if(totalEscrows > 0) {
          LogDebug("totalEscrows > 0");
          return;
      }
      //do not allow killing contract with unclaimed escrow fees
      if(feeFunds > 0) {
          LogDebug("feeFunds > 0");
          return;
      }
      suicide(msg.sender);
  }


//safesend = safe withdraw.
// PITFALL - probably need to change addr.call to addr.send ... ?
  function safeSend(address addr, uint value) internal {

      if(atomicLock) throw;
      atomicLock = true;
      if (!(addr.call.gas(safeGas).value(value)())) {
          atomicLock = false;
          throw;
      }
      atomicLock = false;
  }


  //ESCROW API------------------------------------------------------------------

  //vote YES - immediately sends funds to the peer
  function yes(uint _lockId, string _dataInfo, uint _version) {

      EscrowInfo info = escrows[_lockId];

      if(info.lockedFunds == 0) {
          LogDebug("info.lockedFunds == 0");
          return;
      }
      if(msg.sender != info.buyer && msg.sender != seller) {
          LogDebug("msg.sender != info.buyer && msg.sender != seller");
          return;
      }

      uint payment = info.lockedFunds;
      if(payment > this.balance) {
          //HACK: should not get here - funds cannot be unlocked in this case
          LogDebug("payment > this.balance");
          return;
      }

      //payload
      if(msg.sender == info.buyer) {

          //send funds to seller
          safeSend(seller, payment);
      } else if(msg.sender == seller) {

          //send funds to buyer
          safeSend(info.buyer, payment);
      } else {
          //HACK: should not get here
          LogDebug("unknown msg.sender");
          return;
      }

      //remove record from escrows
      if(totalEscrows > 0) totalEscrows -= 1;
      info.lockedFunds = 0;

      LogEvent(_lockId, _dataInfo, _version, Unlock, msg.sender, payment);
  }




      //vote NO - freeze funds for arbitration
      function no(uint _lockId, string _dataInfo, uint _version) {

          EscrowInfo info = escrows[_lockId];

          if(info.lockedFunds == 0) {
              LogDebug("info.lockedFunds == 0");
              return;
          }
          if(msg.sender != info.buyer && msg.sender != seller) {
              LogDebug("msg.sender != info.buyer && msg.sender != seller");
              return;
          }

          //freeze funds
          //only allow one time freeze
          if(info.frozenFunds == 0) {
              info.frozenFunds = info.lockedFunds;
              info.frozenTime = uint64(now);
          }

          if(msg.sender == info.buyer) {
              info.buyerNo = true;
          }
          else if(msg.sender == seller) {
              info.sellerNo = true;
          } else {
              //HACK: should not get here
              LogDebug("unknown msg.sender");
              return;
          }

          LogEvent(_lockId, _dataInfo, _version, Freeze, msg.sender, info.lockedFunds);
      }

      //arbiter's decision on the case.
      //arbiter can only decide when both buyer and seller voted NO
      //arbiter decides on his own reward but not bigger than announced percentage (rewardPromille)
      function arbYes(uint _lockId, address _who, uint _payment, string _dataInfo, uint _version) onlyArbiter {

          EscrowInfo info = escrows[_lockId];

          if(info.lockedFunds == 0) {
              LogDebug("info.lockedFunds == 0");
              return;
          }
          if(info.frozenFunds == 0) {
              LogDebug("info.frozenFunds == 0");
              return;
          }

          if(_who != seller && _who != info.buyer) {
              LogDebug("_who != seller && _who != info.buyer");
              return;
          }
          //requires both NO to arbitration
          if(!info.buyerNo || !info.sellerNo) {
              LogDebug("!info.buyerNo || !info.sellerNo");
              return;
          }

          if(_payment > info.lockedFunds) {
              LogDebug("_payment > info.lockedFunds");
              return;
          }
          if(_payment > this.balance) {
              //HACK: should not get here - funds cannot be unlocked in this case
              LogDebug("_payment > this.balance");
              return;
          }

          //limit payment
          uint reward = (info.lockedFunds * rewardPromille) / 1000;
          if(reward > (info.lockedFunds - _payment)) {
              LogDebug("reward > (info.lockedFunds - _payment)");
              return;
          }

          //send funds to the winner
          safeSend(_who, _payment);

          //send the rest as reward
          info.lockedFunds -= _payment;
          feeFunds += info.lockedFunds;
          info.lockedFunds = 0;

          LogEvent(_lockId, _dataInfo, _version, Resolved, msg.sender, _payment);
      }

      //allow arbiter to get his collected fees
      function getFees() onlyArbiter {

          if(feeFunds > this.balance) {
              //HACK: should not get here - funds cannot be unlocked in this case
              LogDebug("feeFunds > this.balance");
              return;
          }

          safeSend(arbiter, feeFunds);

          feeFunds = 0;
      }

      //allow buyer or seller to take timeouted funds.
      //buyer can get funds if seller is silent and seller can get funds if buyer is silent (after freezePeriod)
      //buyer can get back funds under arbitration if arbiter is silent (after arbitrationPeriod)
      function getMoney(uint _lockId) {

          EscrowInfo info = escrows[_lockId];

          if(info.lockedFunds == 0) {
              LogDebug("info.lockedFunds == 0");
              return;
          }
          //HACK: this check is necessary since frozenTime == 0 at escrow creation
          if(info.frozenFunds == 0) {
              LogDebug("info.frozenFunds == 0");
              return;
          }

          //timout for voting not over yet
          if(now < (info.frozenTime + freezePeriod)) {
              LogDebug("now < (info.frozenTime + freezePeriod)");
              return;
          }

          uint payment = info.lockedFunds;
          if(payment > this.balance) {
              //HACK: should not get here - funds cannot be unlocked in this case
              LogDebug("payment > this.balance");
              return;
          }

          //both has voted - money is under arbitration
          if(info.buyerNo && info.sellerNo) {

              //arbitration timeout is not over yet
              if(now < (info.frozenTime + freezePeriod + arbitrationPeriod)) {
                  LogDebug("now < (info.frozenTime + freezePeriod + arbitrationPeriod)");
                  return;
              }

              //arbiter was silent so redeem the funds to the buyer
              safeSend(info.buyer, payment);

              info.lockedFunds = 0;
              return;
          }

          if(info.buyerNo) {

              safeSend(info.buyer, payment);

              info.lockedFunds = 0;
              return;
          }
          if(info.sellerNo) {

              safeSend(seller, payment);

              info.lockedFunds = 0;
              return;
          }
      }


//------------------------------------------------------------------------------

//DEALS API---------------------------------------------------------------------

//add new description to the deal - deprecate?
function addDescription(string _dataInfo, uint _version) onlyOwner {

    //Accept order to event log
    LogEvent(0, _dataInfo, _version, Description, msg.sender, 0);
}


//Start deal with escrow
function start(uint _lockId, string _dataInfo, uint _version) payable {

    //reject money transfers for bad status

    if(status != Available) throw;

    if(feePromille > 1000) throw;
    if(rewardPromille > 1000) throw;
    if((feePromille + rewardPromille) > 1000) throw;

    //create default EscrowInfo struct or access existing
    EscrowInfo info = escrows[_lockId];

    //lock only once for a given id
    if(info.lockedFunds > 0) throw;

    //lock funds

    uint fee = (msg.value * feePromille) / 1000;
    //limit fees
    if(fee > msg.value) throw;

    uint funds = (msg.value - fee);
    feeFunds += fee;
    totalEscrows += 1;

    // buyer init escrow deal.
    info.buyer = msg.sender;
    info.lockedFunds = funds;
    info.frozenFunds = 0;
    info.buyerNo = false;
    info.sellerNo = false;


  //  pendingCount += _count;
    buyers[msg.sender] = true;

    //Start order to event log
    LogEvent(_lockId, _dataInfo, _version, Start, msg.sender, msg.value);
}

//DEAL  AUTO-FUNCTIONS----------------------------------------------------------

// Accept funtion is function for seller - he confirm beginning of deal.
//onlyOwner means only Seller.
function accept(uint _lockId, string _dataInfo, uint _version) onlyOwner {

    EscrowInfo info = escrows[_lockId];

// Here is could be rule for auto-accept or auto-throw


//Accept order to event log
    LogEvent(_lockId, _dataInfo, _version, Accept, msg.sender, info.lockedFunds);
}

function done(uint _lockId, string _dataInfo, uint _version) onlyOwner{

  EscrowInfo info = escrows[_lockId];
  
  LogEvent(_lockId, _dataInfo, _version, Done, msg.sender, info.lockedFunds);
}

//Reject functions means that seller denied start deal from buyer.
function reject(uint _lockId, string _dataInfo, uint _version) onlyOwner {

    EscrowInfo info = escrows[_lockId];

    // Here is could be rule for auto-reject or auto-throw



    //send money back

    yes(_lockId, _dataInfo, _version);

    //Reject order to event log
    //HACK: "yes" call above may fail and this event will be non-relevant. Do not rely on it.
    LogEvent(_lockId, _dataInfo, _version, Reject, msg.sender, info.lockedFunds);
}
//-----------------------------------------------------------------------------

//Cancel stop all new deals.
function cancel(string _dataInfo, uint _version) onlyOwner {

    //Canceled status
    status = Canceled;

    //Cancel order to event log
    LogEvent(0, _dataInfo, _version, Cancel, msg.sender, 0);
}


//remove buyer from the watchlist
function stop() {

    buyers[msg.sender] = false;
}

//fallback function deny any deposits to contract
function () {
    throw;
}




//end of contract
}
