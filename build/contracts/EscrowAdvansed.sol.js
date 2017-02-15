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
        "constant": false,
        "inputs": [],
        "name": "stop",
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
        "payable": false,
        "type": "fallback"
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
    "unlinked_binary": "0x60606040526000600b556000600c553461000057604051608080611c8383398101604090815281516020830151918301516060909301519092905b60008054600160a060020a03338116600160a060020a03199283161790925560018054928716929091169190911781556002849055600383905560048290556008805461ffff191690911790555b505050505b611be78061009c6000396000f300606060405236156101225763ffffffff60e060020a600035041663012f52ee811461013457806306909f691461018e57806307da68f5146101e557806308551a53146101f45780630a3cb6631461021d578063200d2ed21461023c5780632fe2221c14610260578063309e21a9146102b35780633262fd9a146102d257806334d24bff146102e457806341c0e1b51461033c5780634ca18ebd1461034b578063553bf56d146103a357806363ee7c8d146103fb5780636958420b1461041a5780636fd637281461048057806395a5dfc01461049f57806397a993aa146104f7578063cc45969614610524578063cd1f839314610543578063db8d55f114610562578063dc3ef68514610571578063eda50e3314610590578063fe25e00a146105e7575b34610000576101325b610000565b565b005b3461000057610144600435610610565b60408051600160a060020a03909716875260208701959095528585019390935267ffffffffffffffff909116606085015215156080840152151560a0830152519081900360c00190f35b3461000057610132600480803590602001908201803590602001908080601f01602080910402602001604051908101604052809392919081815260200183838082843750949650509335935061066192505050565b005b3461000057610132610749565b005b346100005761020161076c565b60408051600160a060020a039092168252519081900360200190f35b346100005761022a61077b565b60408051918252519081900360200190f35b3461000057610249610781565b6040805161ffff9092168252519081900360200190f35b60408051602060046024803582810135601f81018590048502860185019096528585526101329583359593946044949392909201918190840183828082843750949650509335935061078b92505050565b005b346100005761022a610943565b60408051918252519081900360200190f35b3461000057610132600435610949565b005b346100005760408051602060046024803582810135601f810185900485028601850190965285855261013295833595939460449493929092019181908401838280828437509496505093359350610c5392505050565b005b3461000057610132610f11565b005b346100005760408051602060046024803582810135601f810185900485028601850190965285855261013295833595939460449493929092019181908401838280828437509496505093359350610ff792505050565b005b346100005760408051602060046024803582810135601f8101859004850286018501909652858552610132958335959394604494939290920191819084018382808284375094965050933593506110f292505050565b005b346100005761022a6111e8565b60408051918252519081900360200190f35b3461000057604080516020600460643581810135601f81018490048402850184019095528484526101329482359460248035600160a060020a031695604435959460849492019190819084018382808284375094965050933593506111ee92505050565b005b346100005761022a611632565b60408051918252519081900360200190f35b346100005760408051602060046024803582810135601f81018590048502860185019096528585526101329583359593946044949392909201918190840183828082843750949650509335935061163892505050565b005b3461000057610510600160a060020a0360043516611942565b604080519115158252519081900360200190f35b346100005761022a611957565b60408051918252519081900360200190f35b346100005761022a61195d565b60408051918252519081900360200190f35b3461000057610132611963565b005b346100005761022a611a07565b60408051918252519081900360200190f35b3461000057610132600480803590602001908201803590602001908080601f016020809104026020016040519081016040528093929190818152602001838380828437509496505093359350611a0d92505050565b005b3461000057610201611ae9565b60408051600160a060020a039092168252519081900360200190f35b6007602052600090815260409020805460018201546002830154600390930154600160a060020a0390921692909167ffffffffffffffff81169060ff604060020a8204811691604860020a90041686565b60005433600160a060020a0390811691161461067c57610000565b6008805461ffff191660021790556040805160046020808301829052600093830184905260608084528651908401528551600160a060020a0333169486949093600080516020611b9c833981519152938993919286929091829160808301918701908083838215610708575b80518252602083111561070857601f1990920191602091820191016106e8565b505050905090810190601f1680156107345780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b5050565b600160a060020a0333166000908152600960205260409020805460ff191690555b565b600054600160a060020a031681565b60025481565b60085461ffff1681565b6008546000908190819061ffff166001146107a557610000565b6103e860035411156107b657610000565b6103e860045411156107c757610000565b6103e86004546003540111156107dc57610000565b6000868152600760205260408120600181015490945011156107fd57610000565b6003546103e89034020491503482111561081657610000565b506005805482019055600680546001908101909155825473ffffffffffffffffffffffffffffffffffffffff191633600160a060020a031690811784553483810385840181905560006002870181905560038701805469ffff00000000000000001916905583815260096020908152604091829020805460ff191687179055815180820187905291820184905260608083528a51908301528951929589948c94600080516020611b9c833981519152948d949091829160808301919087019080838382156108ff575b8051825260208311156108ff57601f1990920191602091820191016108df565b505050905090810190601f16801561092b5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b505050505050565b60045481565b6000818152600760205260408120600181015490919015156109a657604080516020808252601590820152600080516020611b7c833981519152818301529051600080516020611b5c8339815191529181900360600190a1610c4d565b60028201541515610a04576040805160208082526015908201527f696e666f2e66726f7a656e46756e6473203d3d20300000000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1610c4d565b600254600383015467ffffffffffffffff1601421015610a97576040805160208082526026908201527f6e6f77203c2028696e666f2e66726f7a656e54696d65202b20667265657a6550818301527f6572696f6429000000000000000000000000000000000000000000000000000060608201529051600080516020611b5c8339815191529181900360800190a1610c4d565b506001810154600160a060020a03301631811115610b02576040805160208082526016908201527f7061796d656e74203e20746869732e62616c616e636500000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1610c4d565b6003820154604060020a900460ff168015610b2857506003820154604860020a900460ff165b15610be657600254600383015467ffffffffffffffff160162278d0001421015610bc557604080516020808252603a908201527f6e6f77203c2028696e666f2e66726f7a656e54696d65202b20667265657a6550818301527f6572696f64202b206172626974726174696f6e506572696f642900000000000060608201529051600080516020611b5c8339815191529181900360800190a1610c4d565b8154610bda90600160a060020a031682611af8565b60006001830155610c4d565b6003820154604060020a900460ff1615610c1b578154610bda90600160a060020a031682611af8565b60006001830155610c4d565b6003820154604860020a900460ff1615610c4d57600054610bda90600160a060020a031682611af8565b600060018301555b5b505050565b600083815260076020526040902060018101541515610cad57604080516020808252601590820152600080516020611b7c833981519152818301529051600080516020611b5c8339815191529181900360600190a1610f0b565b805433600160a060020a03908116911614801590610cda575060005433600160a060020a03908116911614155b15610d58576040805160208082526030908201527f6d73672e73656e64657220213d20696e666f2e6275796572202626206d73672e818301527f73656e64657220213d2073656c6c65720000000000000000000000000000000060608201529051600080516020611b5c8339815191529181900360800190a1610f0b565b60028101541515610d8d576001810154600282015560038101805467ffffffffffffffff19164267ffffffffffffffff161790555b805433600160a060020a0390811691161415610dc25760038101805468ff00000000000000001916604060020a179055610e4c565b60005433600160a060020a0390811691161415610df95760038101805469ff0000000000000000001916604860020a179055610e4c565b6040805160208082526012908201527f756e6b6e6f776e206d73672e73656e6465720000000000000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1610f0b565b5b33600160a060020a03168285600080516020611b9c83398151915286600c866001015460405180806020018461ffff1661ffff168152602001838152602001828103825285818151815260200191508051906020019080838360008314610ecf575b805182526020831115610ecf57601f199092019160209182019101610eaf565b505050905090810190601f168015610efb5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b50505050565b60005433600160a060020a03908116911614610f2c57610000565b60006006541115610f8a576040805160208082526010908201527f746f74616c457363726f7773203e203000000000000000000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1610130565b60006005541115610fe857604080516020808252600c908201527f66656546756e6473203e20300000000000000000000000000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1610130565b33600160a060020a0316ff5b5b565b6000805433600160a060020a0390811691161461101357610000565b50600083815260076020526040902061102d848484611638565b33600160a060020a03168285600080516020611b9c833981519152866003866001015460405180806020018461ffff1661ffff168152602001838152602001828103825285818151815260200191508051906020019080838360008314610ecf575b805182526020831115610ecf57601f199092019160209182019101610eaf565b505050905090810190601f168015610efb5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b50505050565b6000805433600160a060020a0390811691161461110e57610000565b60076000858152602001908152602001600020905033600160a060020a03168285600080516020611b9c833981519152866002866001015460405180806020018461ffff1661ffff168152602001838152602001828103825285818151815260200191508051906020019080838360008314610ecf575b805182526020831115610ecf57601f199092019160209182019101610eaf565b505050905090810190601f168015610efb5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b50505050565b60065481565b600154600090819033600160a060020a0390811691161461120e57610000565b60008781526007602052604090206001810154909250151561126b57604080516020808252601590820152600080516020611b7c833981519152818301529051600080516020611b5c8339815191529181900360600190a1611628565b600282015415156112c9576040805160208082526015908201527f696e666f2e66726f7a656e46756e6473203d3d20300000000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1611628565b600054600160a060020a038781169116148015906112f457508154600160a060020a03878116911614155b15611372576040805160208082526024908201527f5f77686f20213d2073656c6c6572202626205f77686f20213d20696e666f2e62818301527f757965720000000000000000000000000000000000000000000000000000000060608201529051600080516020611b5c8339815191529181900360800190a1611628565b6003820154604060020a900460ff16158061139957506003820154604860020a900460ff16155b156113f157604080516020808252601f908201527f21696e666f2e62757965724e6f207c7c2021696e666f2e73656c6c65724e6f00818301529051600080516020611b5c8339815191529181900360600190a1611628565b816001015485111561145057604080516020808252601b908201527f5f7061796d656e74203e20696e666f2e6c6f636b656446756e64730000000000818301529051600080516020611b5c8339815191529181900360600190a1611628565b30600160a060020a0316318511156114b5576040805160208082526017908201527f5f7061796d656e74203e20746869732e62616c616e6365000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1611628565b60045460018301546103e891020490508482600101540381111561154c576040805160208082526026908201527f726577617264203e2028696e666f2e6c6f636b656446756e6473202d205f7061818301527f796d656e7429000000000000000000000000000000000000000000000000000060608201529051600080516020611b5c8339815191529181900360800190a1611628565b6115568686611af8565b6001820180548690038082556005805490910190556000905560408051600d602080830182905292820188905260608083528751908301528651600160a060020a0333169387938c93600080516020611b9c833981519152938b9391928d929091829160808301919087019080838382156115ec575b8051825260208311156115ec57601f1990920191602091820191016115cc565b505050905090810190601f1680156116185780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b50505050505050565b60055481565b60008381526007602052604081206001810154909190151561169557604080516020808252601590820152600080516020611b7c833981519152818301529051600080516020611b5c8339815191529181900360600190a161193b565b815433600160a060020a039081169116148015906116c2575060005433600160a060020a03908116911614155b15611740576040805160208082526030908201527f6d73672e73656e64657220213d20696e666f2e6275796572202626206d73672e818301527f73656e64657220213d2073656c6c65720000000000000000000000000000000060608201529051600080516020611b5c8339815191529181900360800190a161193b565b506001810154600160a060020a033016318111156117ab576040805160208082526016908201527f7061796d656e74203e20746869732e62616c616e636500000000000000000000818301529051600080516020611b5c8339815191529181900360600190a161193b565b815433600160a060020a03908116911614156117dc576000546117d790600160a060020a031682611af8565b611860565b60005433600160a060020a039081169116141561180d5781546117d790600160a060020a031682611af8565b611860565b6040805160208082526012908201527f756e6b6e6f776e206d73672e73656e6465720000000000000000000000000000818301529051600080516020611b5c8339815191529181900360600190a161193b565b5b6000600654111561187757600680546000190190555b6000826001018190555033600160a060020a03168386600080516020611b9c83398151915287600b8660405180806020018461ffff1661ffff1681526020018381526020018281038252858181518152602001915080519060200190808383600083146118ff575b8051825260208311156118ff57601f1990920191602091820191016118df565b505050905090810190601f16801561192b5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5050505050565b60096020526000908152604090205460ff1681565b600b5481565b600c5481565b60015433600160a060020a0390811691161461197e57610000565b30600160a060020a03163160055411156119e5576040805160208082526017908201527f66656546756e6473203e20746869732e62616c616e6365000000000000000000818301529051600080516020611b5c8339815191529181900360600190a1610130565b6001546005546119fe91600160a060020a031690611af8565b60006005555b5b565b60035481565b60005433600160a060020a03908116911614611a2857610000565b33600160a060020a0316816000600080516020611b9c83398151915285600a600060405180806020018461ffff1661ffff168152602001838152602001828103825285818151815260200191508051906020019080838360008314610708575b80518252602083111561070857601f1990920191602091820191016106e8565b505050905090810190601f1680156107345780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a45b5b5050565b600154600160a060020a031681565b600a5460ff1615611b0857610000565b600a805460ff19166001179055604051600160a060020a038316906161a89083906000818181858888f193505050501515611b4c57600a805460ff19169055610000565b600a805460ff191690555b50505600d44da6836c8376d1693e8b9cacf1c39b9bed3599164ad6d8e60902515f83938e696e666f2e6c6f636b656446756e6473203d3d20300000000000000000000000741f01a9fb5039b148b89c9fb0f21daf0daa3d0daa4b8cd8b382c3e61e5df503a165627a7a7230582055e57928f5d41328883925e58706e878543fbb1e2722bca9759d076e6b9698e60029",
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
    "updated_at": 1487152374090,
    "links": {},
    "address": "0x5f3f3f1c142c4b085ba3de18e7e06871e1ba810e"
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
