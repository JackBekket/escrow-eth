var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("EscrowAdvansed error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("EscrowAdvansed error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("EscrowAdvansed contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of EscrowAdvansed: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to EscrowAdvansed.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: EscrowAdvansed not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "escrows",
        "outputs": [
          {
            "name": "buyer",
            "type": "address"
          },
          {
            "name": "lockedFunds",
            "type": "uint256"
          },
          {
            "name": "frozenFunds",
            "type": "uint256"
          },
          {
            "name": "frozenTime",
            "type": "uint64"
          },
          {
            "name": "buyerNo",
            "type": "bool"
          },
          {
            "name": "sellerNo",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "cancel",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "seller",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "freezePeriod",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "status",
        "outputs": [
          {
            "name": "",
            "type": "uint16"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_lockId",
            "type": "uint256"
          },
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "start",
        "outputs": [],
        "payable": true,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "rewardPromille",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_lockId",
            "type": "uint256"
          }
        ],
        "name": "getMoney",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_lockId",
            "type": "uint256"
          },
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "no",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "kill",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_lockId",
            "type": "uint256"
          },
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "reject",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_lockId",
            "type": "uint256"
          },
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "accept",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalEscrows",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_lockId",
            "type": "uint256"
          },
          {
            "name": "_who",
            "type": "address"
          },
          {
            "name": "_payment",
            "type": "uint256"
          },
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "arbYes",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "feeFunds",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_lockId",
            "type": "uint256"
          },
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "yes",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "buyers",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "contentCount",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "logsCount",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "getFees",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "feePromille",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_dataInfo",
            "type": "string"
          },
          {
            "name": "_version",
            "type": "uint256"
          }
        ],
        "name": "addDescription",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "arbiter",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_arbiter",
            "type": "address"
          },
          {
            "name": "_freezePeriod",
            "type": "uint256"
          },
          {
            "name": "_feePromille",
            "type": "uint256"
          },
          {
            "name": "_rewardPromille",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "LogDebug",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "lockId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "dataInfo",
            "type": "string"
          },
          {
            "indexed": true,
            "name": "version",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "eventType",
            "type": "uint16"
          },
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "payment",
            "type": "uint256"
          }
        ],
        "name": "LogEvent",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x60606040526000600b556000600c553461000057604051608080611c3983398101604090815281516020830151918301516060909301519092905b60008054600160a060020a03338116600160a060020a03199283161790925560018054928716929091169190911781556002849055600383905560048290556008805461ffff191690911790555b505050505b611b9d8061009c6000396000f300606060405236156101175763ffffffff60e060020a600035041663012f52ee811461011c57806306909f691461017657806308551a53146101cd5780630a3cb663146101f6578063200d2ed2146102155780632fe2221c14610239578063309e21a91461028c5780633262fd9a146102ab57806334d24bff146102bd57806341c0e1b5146103155780634ca18ebd14610324578063553bf56d1461037c57806363ee7c8d146103d45780636958420b146103f35780636fd637281461045957806395a5dfc01461047857806397a993aa146104d0578063cc459696146104fd578063cd1f83931461051c578063db8d55f11461053b578063dc3ef6851461054a578063eda50e3314610569578063fe25e00a146105c0575b610000565b346100005761012c6004356105e9565b60408051600160a060020a03909716875260208701959095528585019390935267ffffffffffffffff909116606085015215156080840152151560a0830152519081900360c00190f35b34610000576101cb600480803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843750949650509335935061063a92505050565b005b34610000576101da610722565b60408051600160a060020a039092168252519081900360200190f35b3461000057610203610731565b60408051918252519081900360200190f35b3461000057610222610737565b6040805161ffff9092168252519081900360200190f35b60408051602060046024803582810135601f81018590048502860185019096528585526101cb9583359593946044949392909201918190840183828082843750949650509335935061074192505050565b005b34610000576102036108f9565b60408051918252519081900360200190f35b34610000576101cb6004356108ff565b005b346100005760408051602060046024803582810135601f81018590048502860185019096528585526101cb95833595939460449493929092019181908401838280828437509496505093359350610c0992505050565b005b34610000576101cb610ec7565b005b346100005760408051602060046024803582810135601f81018590048502860185019096528585526101cb95833595939460449493929092019181908401838280828437509496505093359350610fad92505050565b005b346100005760408051602060046024803582810135601f81018590048502860185019096528585526101cb958335959394604494939290920191819084018382808284375094965050933593506110a892505050565b005b346100005761020361119e565b60408051918252519081900360200190f35b3461000057604080516020600460643581810135601f81018490048402850184019095528484526101cb9482359460248035600160a060020a031695604435959460849492019190819084018382808284375094965050933593506111a492505050565b005b34610000576102036115e8565b60408051918252519081900360200190f35b346100005760408051602060046024803582810135601f81018590048502860185019096528585526101cb958335959394604494939290920191819084018382808284375094965050933593506115ee92505050565b005b34610000576104e9600160a060020a03600435166118f8565b604080519115158252519081900360200190f35b346100005761020361190d565b60408051918252519081900360200190f35b3461000057610203611913565b60408051918252519081900360200190f35b34610000576101cb611919565b005b34610000576102036119bd565b60408051918252519081900360200190f35b34610000576101cb600480803590602001908201803590602001908080601f0160208091040260200160405190810160405280939291908181526020018383808284375094965050933593506119c392505050565b005b34610000576101da611a9f565b60408051600160a060020a039092168252519081900360200190f35b6007602052600090815260409020805460018201546002830154600390930154600160a060020a0390921692909167ffffffffffffffff81169060ff604060020a8204811691604860020a90041686565b60005433600160a060020a0390811691161461065557610000565b6008805461ffff191660021790556040805160046020808301829052600093830184905260608084528651908401528551600160a060020a0333169486949093600080516020611b528339815191529389939192869290918291608083019187019080838382156106e1575b8051825260208311156106e157601f1990920191602091820191016106c1565b505050905090810190601f16801561070d5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b5050565b600054600160a060020a031681565b60025481565b60085461ffff1681565b6008546000908190819061ffff1660011461075b57610000565b6103e8600354111561076c57610000565b6103e8600454111561077d57610000565b6103e860045460035401111561079257610000565b6000868152600760205260408120600181015490945011156107b357610000565b6003546103e8903402049150348211156107cc57610000565b506005805482019055600680546001908101909155825473ffffffffffffffffffffffffffffffffffffffff191633600160a060020a031690811784553483810385840181905560006002870181905560038701805469ffff00000000000000001916905583815260096020908152604091829020805460ff191687179055815180820187905291820184905260608083528a51908301528951929589948c94600080516020611b52833981519152948d949091829160808301919087019080838382156108b5575b8051825260208311156108b557601f199092019160209182019101610895565b505050905090810190601f1680156108e15780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b505050505050565b60045481565b60008181526007602052604081206001810154909190151561095c57604080516020808252601590820152600080516020611b32833981519152818301529051600080516020611b128339815191529181900360600190a1610c03565b600282015415156109ba576040805160208082526015908201527f696e666f2e66726f7a656e46756e6473203d3d20300000000000000000000000818301529051600080516020611b128339815191529181900360600190a1610c03565b600254600383015467ffffffffffffffff1601421015610a4d576040805160208082526026908201527f6e6f77203c2028696e666f2e66726f7a656e54696d65202b20667265657a6550818301527f6572696f6429000000000000000000000000000000000000000000000000000060608201529051600080516020611b128339815191529181900360800190a1610c03565b506001810154600160a060020a03301631811115610ab8576040805160208082526016908201527f7061796d656e74203e20746869732e62616c616e636500000000000000000000818301529051600080516020611b128339815191529181900360600190a1610c03565b6003820154604060020a900460ff168015610ade57506003820154604860020a900460ff165b15610b9c57600254600383015467ffffffffffffffff160162278d0001421015610b7b57604080516020808252603a908201527f6e6f77203c2028696e666f2e66726f7a656e54696d65202b20667265657a6550818301527f6572696f64202b206172626974726174696f6e506572696f642900000000000060608201529051600080516020611b128339815191529181900360800190a1610c03565b8154610b9090600160a060020a031682611aae565b60006001830155610c03565b6003820154604060020a900460ff1615610bd1578154610b9090600160a060020a031682611aae565b60006001830155610c03565b6003820154604860020a900460ff1615610c0357600054610b9090600160a060020a031682611aae565b600060018301555b5b505050565b600083815260076020526040902060018101541515610c6357604080516020808252601590820152600080516020611b32833981519152818301529051600080516020611b128339815191529181900360600190a1610ec1565b805433600160a060020a03908116911614801590610c90575060005433600160a060020a03908116911614155b15610d0e576040805160208082526030908201527f6d73672e73656e64657220213d20696e666f2e6275796572202626206d73672e818301527f73656e64657220213d2073656c6c65720000000000000000000000000000000060608201529051600080516020611b128339815191529181900360800190a1610ec1565b60028101541515610d43576001810154600282015560038101805467ffffffffffffffff19164267ffffffffffffffff161790555b805433600160a060020a0390811691161415610d785760038101805468ff00000000000000001916604060020a179055610e02565b60005433600160a060020a0390811691161415610daf5760038101805469ff0000000000000000001916604860020a179055610e02565b6040805160208082526012908201527f756e6b6e6f776e206d73672e73656e6465720000000000000000000000000000818301529051600080516020611b128339815191529181900360600190a1610ec1565b5b33600160a060020a03168285600080516020611b5283398151915286600c866001015460405180806020018461ffff1661ffff168152602001838152602001828103825285818151815260200191508051906020019080838360008314610e85575b805182526020831115610e8557601f199092019160209182019101610e65565b505050905090810190601f168015610eb15780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b50505050565b60005433600160a060020a03908116911614610ee257610000565b60006006541115610f40576040805160208082526010908201527f746f74616c457363726f7773203e203000000000000000000000000000000000818301529051600080516020611b128339815191529181900360600190a1610faa565b60006005541115610f9e57604080516020808252600c908201527f66656546756e6473203e20300000000000000000000000000000000000000000818301529051600080516020611b128339815191529181900360600190a1610faa565b33600160a060020a0316ff5b5b565b6000805433600160a060020a03908116911614610fc957610000565b506000838152600760205260409020610fe38484846115ee565b33600160a060020a03168285600080516020611b52833981519152866003866001015460405180806020018461ffff1661ffff168152602001838152602001828103825285818151815260200191508051906020019080838360008314610e85575b805182526020831115610e8557601f199092019160209182019101610e65565b505050905090810190601f168015610eb15780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b50505050565b6000805433600160a060020a039081169116146110c457610000565b60076000858152602001908152602001600020905033600160a060020a03168285600080516020611b52833981519152866002866001015460405180806020018461ffff1661ffff168152602001838152602001828103825285818151815260200191508051906020019080838360008314610e85575b805182526020831115610e8557601f199092019160209182019101610e65565b505050905090810190601f168015610eb15780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b50505050565b60065481565b600154600090819033600160a060020a039081169116146111c457610000565b60008781526007602052604090206001810154909250151561122157604080516020808252601590820152600080516020611b32833981519152818301529051600080516020611b128339815191529181900360600190a16115de565b6002820154151561127f576040805160208082526015908201527f696e666f2e66726f7a656e46756e6473203d3d20300000000000000000000000818301529051600080516020611b128339815191529181900360600190a16115de565b600054600160a060020a038781169116148015906112aa57508154600160a060020a03878116911614155b15611328576040805160208082526024908201527f5f77686f20213d2073656c6c6572202626205f77686f20213d20696e666f2e62818301527f757965720000000000000000000000000000000000000000000000000000000060608201529051600080516020611b128339815191529181900360800190a16115de565b6003820154604060020a900460ff16158061134f57506003820154604860020a900460ff16155b156113a757604080516020808252601f908201527f21696e666f2e62757965724e6f207c7c2021696e666f2e73656c6c65724e6f00818301529051600080516020611b128339815191529181900360600190a16115de565b816001015485111561140657604080516020808252601b908201527f5f7061796d656e74203e20696e666f2e6c6f636b656446756e64730000000000818301529051600080516020611b128339815191529181900360600190a16115de565b30600160a060020a03163185111561146b576040805160208082526017908201527f5f7061796d656e74203e20746869732e62616c616e6365000000000000000000818301529051600080516020611b128339815191529181900360600190a16115de565b60045460018301546103e8910204905084826001015403811115611502576040805160208082526026908201527f726577617264203e2028696e666f2e6c6f636b656446756e6473202d205f7061818301527f796d656e7429000000000000000000000000000000000000000000000000000060608201529051600080516020611b128339815191529181900360800190a16115de565b61150c8686611aae565b6001820180548690038082556005805490910190556000905560408051600d602080830182905292820188905260608083528751908301528651600160a060020a0333169387938c93600080516020611b52833981519152938b9391928d929091829160808301919087019080838382156115a2575b8051825260208311156115a257601f199092019160209182019101611582565b505050905090810190601f1680156115ce5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b50505050505050565b60055481565b60008381526007602052604081206001810154909190151561164b57604080516020808252601590820152600080516020611b32833981519152818301529051600080516020611b128339815191529181900360600190a16118f1565b815433600160a060020a03908116911614801590611678575060005433600160a060020a03908116911614155b156116f6576040805160208082526030908201527f6d73672e73656e64657220213d20696e666f2e6275796572202626206d73672e818301527f73656e64657220213d2073656c6c65720000000000000000000000000000000060608201529051600080516020611b128339815191529181900360800190a16118f1565b506001810154600160a060020a03301631811115611761576040805160208082526016908201527f7061796d656e74203e20746869732e62616c616e636500000000000000000000818301529051600080516020611b128339815191529181900360600190a16118f1565b815433600160a060020a03908116911614156117925760005461178d90600160a060020a031682611aae565b611816565b60005433600160a060020a03908116911614156117c357815461178d90600160a060020a031682611aae565b611816565b6040805160208082526012908201527f756e6b6e6f776e206d73672e73656e6465720000000000000000000000000000818301529051600080516020611b128339815191529181900360600190a16118f1565b5b6000600654111561182d57600680546000190190555b6000826001018190555033600160a060020a03168386600080516020611b5283398151915287600b8660405180806020018461ffff1661ffff1681526020018381526020018281038252858181518152602001915080519060200190808383600083146118b5575b8051825260208311156118b557601f199092019160209182019101611895565b505050905090810190601f1680156118e15780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5050505050565b60096020526000908152604090205460ff1681565b600b5481565b600c5481565b60015433600160a060020a0390811691161461193457610000565b30600160a060020a031631600554111561199b576040805160208082526017908201527f66656546756e6473203e20746869732e62616c616e6365000000000000000000818301529051600080516020611b128339815191529181900360600190a1610faa565b6001546005546119b491600160a060020a031690611aae565b60006005555b5b565b60035481565b60005433600160a060020a039081169116146119de57610000565b33600160a060020a0316816000600080516020611b5283398151915285600a600060405180806020018461ffff1661ffff1681526020018381526020018281038252858181518152602001915080519060200190808383600083146106e1575b8051825260208311156106e157601f1990920191602091820191016106c1565b505050905090810190601f16801561070d5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b5050565b600154600160a060020a031681565b600a5460ff1615611abe57610000565b600a805460ff19166001179055604051600160a060020a038316906161a89083906000818181858888f193505050501515611b0257600a805460ff19169055610000565b600a805460ff191690555b50505600d44da6836c8376d1693e8b9cacf1c39b9bed3599164ad6d8e60902515f83938e696e666f2e6c6f636b656446756e6473203d3d20300000000000000000000000741f01a9fb5039b148b89c9fb0f21daf0daa3d0daa4b8cd8b382c3e61e5df503a165627a7a7230582068fe1272ac85f6ee72ea5617321b2436a9013d90c4d2f94c20acc349506f28300029",
    "events": {
      "0xd44da6836c8376d1693e8b9cacf1c39b9bed3599164ad6d8e60902515f83938e": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "LogDebug",
        "type": "event"
      },
      "0xe9a88fc67f5ad8c6d6e6fb2832af9558ebc4c2f6395337eec27c17f1ee9ebc1f": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "lockId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "dataInfo",
            "type": "string"
          },
          {
            "indexed": true,
            "name": "version",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "eventType",
            "type": "uint16"
          },
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "count",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "payment",
            "type": "uint256"
          }
        ],
        "name": "LogEvent",
        "type": "event"
      },
      "0x741f01a9fb5039b148b89c9fb0f21daf0daa3d0daa4b8cd8b382c3e61e5df503": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "lockId",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "dataInfo",
            "type": "string"
          },
          {
            "indexed": true,
            "name": "version",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "eventType",
            "type": "uint16"
          },
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "payment",
            "type": "uint256"
          }
        ],
        "name": "LogEvent",
        "type": "event"
      }
    },
    "updated_at": 1486653061461
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "EscrowAdvansed";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.EscrowAdvansed = Contract;
  }
})();
