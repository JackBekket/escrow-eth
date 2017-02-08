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

  //seller/owner of the goods
  address public seller;

  //escrow related

  address public arbiter;

  uint public freezePeriod;
  //each lock fee in promilles.
  uint public feePromille;
  //reward in promilles. promille = percent * 10, eg 1,5% reward = 15 rewardPromille
  uint public rewardPromille;

  uint public feeFunds;
  uint public totalEscrows;

  mapping (uint => EscrowInfo) public escrows;

  //goods related

  //status of the goods: Available, Pending, Sold, Canceled
  uint16 public status;
  //how many for sale
  uint16 public count;
  //price per item
  uint public price;

  uint16 public availableCount;
  uint16 public pendingCount;

  mapping (address => uint) public buyers;

  uint16 atomicLock;

  //events

  event log_event(string message);
  event content(uint indexed lockid, string datainfo, uint indexed version, uint datatype, address indexed sender, uint count, uint payment);
  modifier onlyowner() { if (msg.sender == seller) _; }

  //modules


function EscrowAdvansed(){







}



}
