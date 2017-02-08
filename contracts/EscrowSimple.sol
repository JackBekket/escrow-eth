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
      seller.send(this.balance);
    }
  }

  //refund transaction
  function refundToBuyer() {
    if(msg.sender == seller || msg.sender == arbiter) {
      buyer.send(this.balance);
    }
  }

  //query for balance
  function getBalance() constant returns (uint) {
    return this.balance;
  }

}
