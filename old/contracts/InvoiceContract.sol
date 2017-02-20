pragma solidity ^0.4.2;


contract InvoiceContract{
    /*
    Invoice Contract v.0.1.
    Non static contract.

    I won't explain protocol based functions again (check the escrow contract).
    How to use:
        1) When creating contract enter arguments in the constructor in the solidity
        online compiler. Don't forget the quotes.
        2) call acceptContract() even though the consentent check is not implemented yet
        3) You can use the getters to check informations
        4) call pay Invoice when you want to pay the creditor.
    */


    event AcceptContractStatus (address _account, string message);
    event DebitorHasPaidStatus (uint amount, string message);
    event CreditorIsPaidStatus (uint amount, string message);

    // Saves the infos about the acceptors (additional security)
    mapping(address => ConsentProtocol) consentOf;

    struct ConsentProtocol{
        // Standard protocol to see if user accepted the contract
        address acceptant;
        uint acceptTime;
        bytes32 signedAcceptTime;
        string message;
    }
    // Array because multiple users can consent.
    ConsentProtocol[] consentProtocol;

    struct InitProtocol{
        // Called on contract init only.
        // Stores information about the contract.
        address sender;
        uint accountBalance;
        uint creaTime;
        uint endTime;
        bytes32 signedCreaTime;

    }
    InitProtocol initProtocol;

    struct InvoiceModule{
        // Module for contracts that need an invoice
        // This is basically a structured message.
        string message;
        string product;
        uint amount2pay;
        string limitDate;
        bool paid;
    }
    InvoiceModule invoice;

    function InvoiceContract(uint _amount2pay, string _product,
                            string _message, string _limitDate){

        // Because this is a bilateral contract automatically binds the consent of the first party.
        consentProtocol.push(ConsentProtocol(msg.sender, now,
                            keccak256(now),'Corp. A Accepts this contract'));
        invoice = InvoiceModule({
            message : _message,
            product : _product,
            amount2pay : _amount2pay,
            limitDate : _limitDate,
            paid: false
        });
        initProtocol = InitProtocol(msg.sender, this.balance,
                        now, now + 1000, keccak256(now));
    }

    function acceptContract(string _message) returns (bool _success) {
        // Save the user acceptance into array of consentProtocol.
        // That way we will be able to see if user accepted the contract

        // Create a temp ConsentProtocol array member in memory
        ConsentProtocol memory temp = ConsentProtocol(
            {
                acceptant: msg.sender,
                acceptTime: now,
                signedAcceptTime: keccak256(now),
                message: _message
            });
        // push function returns the lenght of the array
        uint len = consentProtocol.push(temp) - 1;
        // Bind the user account to the acceptObject.
        // That way we can find all the info about his acceptance.
        consentOf[msg.sender] = consentProtocol[len];
        AcceptContractStatus(msg.sender, 'Contract Invoice accepted!');
        _success = true;
    }

    function payInvoice() payable returns (bool){
        // Receives money from debitor and pays the creditor
        if (this.balance >= invoice.amount2pay){
            DebitorHasPaidStatus(msg.value, 'Debitor has paid');
            invoice.paid = true;
            // Cashback if debitor has paid too much
            if (this.balance > invoice.amount2pay){
                msg.sender.send(this.balance - invoice.amount2pay);
            }
            uint temp  = this.balance;
            if (initProtocol.sender.send(temp)){
                CreditorIsPaidStatus(temp, 'Creditor is paid');
                return true;
            }
            else{
                CreditorIsPaidStatus(temp, 'Error: Creditor is not paid');
                return false;
            }
        }
        else {
            DebitorHasPaidStatus(msg.value, 'Debitor has not paid all');
            return false;
        }
    }

    function getInvoice() constant returns (string,string,uint,string,bool){
        return(invoice.message,invoice.product,
            invoice.amount2pay,invoice.limitDate,invoice.paid);

    }

    function getConsent() constant returns (address, uint, bytes32, string){
        ConsentProtocol memory temp = consentOf[msg.sender];
        return (temp.acceptant,temp.acceptTime,
                temp.signedAcceptTime, temp.message);
    }

    function getInit() constant returns (address, uint, uint, uint, bytes32){
        // initProtocol.accountBalance temporarily replaced
        return (initProtocol.sender,this.balance, initProtocol.creaTime,
                initProtocol.endTime, initProtocol.signedCreaTime);
    }
}
