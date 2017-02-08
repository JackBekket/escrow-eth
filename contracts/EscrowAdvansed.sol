pragma solidity ^0.4.0;


/**
author-Sergey Ponomarev (JackBekket)

seller = initiator
buyer = executor
logic - seller sell something (e.g some service), buyer is ready to buy.

**/

contract EscrowAdvansed {


  // Info about specific EscrowCase
  struct EscrowInfo {

      address buyer;
      uint lockedFunds;
      uint frozenFunds;
      uint64 frozenTime;
      uint16 count;
      bool buyerNo;
      bool sellerNo;
  }


  uint constant arbitragePeriod = 30 days;
  uint constant safeGas = 25000;

  //enum EventTypes
  uint16 constant internal Buy = 1;
  uint16 constant internal Accept = 2;
  uint16 constant internal Reject = 3;
  uint16 constant internal Cancel = 4;
  uint16 constant internal Description = 10;
  uint16 constant internal Unlock = 11;
  uint16 constant internal Freeze = 12;
  uint16 constant internal Resolved = 13;



  //seller/owner of the contract
  address public seller;

  //escrow related

  address public arbiter;


  //event counters
  uint public contentCount = 0;
  uint public logsCount = 0;



  uint public freezePeriod;
  //each lock fee in promilles.
  uint public feePromille;
  //reward in promilles. promille = percent * 10, eg 1,5% reward = 15 rewardPromille
  uint public rewardPromille;

  uint public feeFunds;
  uint public totalEscrows;

  mapping (uint => EscrowInfo) public escrows;

  //goods related

  //status of the goods  - probably deprecate it
  uint16 public status;

  //how many for sale - probably deprecate it
  uint16 public count;

  //price per item
  uint public price;

  uint16 public availableCount;
  uint16 public pendingCount;

  // array of buyers.
  mapping (address => uint) public buyers;

  uint16 atomicLock;

  //events

  event LogDebug(string message);
  event LogEvent(uint indexed lockId, string dataInfo, uint indexed version, uint16 eventType, address indexed sender, uint count, uint payment);

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


  //modules


function EscrowAdvansed(){







}



}
