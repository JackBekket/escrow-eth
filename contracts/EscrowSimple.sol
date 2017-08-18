pragma solidity ^0.4.11;

/**

/// @author SergeyPonomarev(JackBekket)

buyer = initiator
seller = executor

Simple Escrow service without hard-modifiers and state VALUES






**/


contract EscrowSimple {

  //set variables
  address public buyer;
  address public seller;
  address public arbiter;

  //constructor runs once
  function EscrowSimple(address _seller, address _arbiter) {
    buyer = msg.sender;
    seller = _seller;
    arbiter = _arbiter;
  }

  //make payment to seller
  function payoutToSeller() {
    if(msg.sender == buyer || msg.sender == arbiter) {
    if(!seller.send(this.balance)) revert();
    }
  }

  //refund transaction
  function refundToBuyer() {
    if(msg.sender == seller || msg.sender == arbiter) {
    if(!buyer.send(this.balance)) revert();
    }
  }

  //query for balance
  function getBalance() constant returns (uint) {
    return this.balance;
  }

}
