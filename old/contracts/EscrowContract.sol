pragma solidity ^0.4.2;


contract EscrowContract {
    /*
    Escrow Contract v.0.1.
    Static contract.

    How to use:
        At the moment this contract is for two parties. Multilateral logic
        will be added later if needed.
        The creator of the contract (the user who deploys it on Blockchain)
        gives his consent automatically (this can be changed if the deploy
        is not a party in the contract).
        ! Before doing something one needs to accept the terms of the contract.
        This is done by the generic function acceptContract() implementing the
        consent protocol.

        NB: Protocols are intercontract standard logic that needs to be present
        in each contract. Modules are parts you actually choose and personalize
        depending of the contract.

        Then one needs to deposit some funds to the contract with setDeposit().
        [Very important: The contract can only transfer funds from it's own
        storage. It cannot transfer ethers from an account to another.
        Obvious security reasons]

        From then you can either withdraw() a certain amount of ether (always in wei)
        or you can withdraw all ether you deposited. The contract automatically
        keeps track of who deposited what. You can try depositing from different
        accounts.


        getDeposit() shows how much you deposited
        getInit() and getConsent() are generic protocol getters for information.

        TL;DR

        1) call acceptContract() with a string argument
        2) call setDeposit specifying the value to be transferd to the contract.
        Note that this is not a function argument. You need to choose the value
        on the top of the second tab in solidity online compiler. Don't forget to add
        wei at the end of your number because the standard input is in ether.

        3) call withdraw() or withdrawAll() and call getDeposit() to see the amount
        being updated. Don't forget to erase your ether value entry when calling
        any other function than setDeposit(). Only payable functions can accept ether.

    */

    event DepositStatus (uint _amount, string message);
    event AcceptContractStatus (address _account, string message);
    event WithdrawStatus (uint _amount, string message);

    // Saves the infos about the depositor
    mapping(address => DepositModule) depositOf;
    // Saves the infos about the acceptors (additional security)
    mapping(address => ConsentProtocol) consentOf;


    function EscrowContract(string _message){
        // Constructor
        initProtocol = InitProtocol(msg.sender, this.balance,
                        now, now + 1000, keccak256(now));
        consentProtocol.push(ConsentProtocol(msg.sender, now,
                            keccak256(now), _message));
    }

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

    struct DepositModule{
        // Module for contracts that need to store deposits
        uint amount;
        address depositor;
    }
    // Stores deposits and who made them
    DepositModule[] depositModule;

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
        AcceptContractStatus(msg.sender, 'Contract Escrow accepted!');
        _success = true;
    }

    function setDeposit() payable returns (bool){
        // Deposit money into account
        // The function is payable. Ether already transfered to contract.

        // Check if user accepted the contract.
        if (consentOf[msg.sender].acceptant != 0x0){
            // Save the depositor's data
            depositOf[msg.sender].amount += msg.value;
            depositOf[msg.sender].depositor = msg.sender;
            DepositStatus(msg.value, 'Deposit succeeded');
            return true;
        }
        else {
            DepositStatus(msg.value, 'Deposit failed!');
            return false;
        }
    }

    function withdrawAll() returns (bool){
        // User can withdraw all money he has deposited
        if (depositOf[msg.sender].depositor != 0x0 && depositOf[msg.sender].amount > 0){
            uint temp = depositOf[msg.sender].amount;
            if(msg.sender.send(temp)){
                depositOf[msg.sender].amount -= temp;
                WithdrawStatus(temp, 'Withraw succeeded');
                return true;
            }
            else {
                depositOf[msg.sender].amount = temp;
                WithdrawStatus(temp, 'Withraw failed!');
                return false;
            }
        }
        else {
            WithdrawStatus(temp, 'Withraw failed!');
            return false;
        }
    }

    function withdraw(uint _amount) returns (bool){
        // User can withdraw some money he has deposited
        if (depositOf[msg.sender].depositor != 0x0 && depositOf[msg.sender].amount > 0){
            uint temp = depositOf[msg.sender].amount;
            if(_amount <= temp){
                if(msg.sender.send(_amount)){
                    depositOf[msg.sender].amount -= _amount;
                    WithdrawStatus(_amount, 'Withraw succeeded');
                    return true;
                }
                else{
                    WithdrawStatus(_amount, 'Withraw failed');
                    depositOf[msg.sender].amount = temp;
                    return false;
                }
            }
            else {
                WithdrawStatus(_amount, 'Withraw failed: given amount too big');
                return false;
            }
        }
        else {
            WithdrawStatus(_amount, 'Withraw failed: account void or non existent');
            return false;
        }
        return true;
    }


    function getInit() constant returns (address, uint, uint, uint, bytes32){
        // initProtocol.accountBalance temporarily replaced
        return (initProtocol.sender,this.balance, initProtocol.creaTime,
                initProtocol.endTime, initProtocol.signedCreaTime);
    }

    function getConsent() constant returns (address, uint, bytes32, string){
        ConsentProtocol memory temp = consentOf[msg.sender];
        return (temp.acceptant,temp.acceptTime,
                temp.signedAcceptTime, temp.message);
    }

    function getDeposit() constant returns (uint _deposit){
        // Check how much money user deposited
        _deposit = depositOf[msg.sender].amount;
    }
}
