//simulate Copay multisig wallet
var wallet = [];
var proposals = [];
var lockedUTXOs = [];
var spent = [];
var fees = [];

//start simulation
receive(100000);
status('=========== received 100000 ===========');
var txA = proposeSpend(500);
var txB = proposeSpend(1000);
var txC = proposeSpend(50);
status('=========== TXs proposed ===========');
reject(txA);
reject(txC);
accept(txB);
status('=========== TXs handled ===========');


// end simulation




// wallet logic

function receive(amount) {
  utxoId = wallet.length;
  wallet.push({
    utxoId: utxoId,
    amount: amount
  });
}

function getBalance() {
  var balance = 0;
  for (var a = 0; a < wallet.length; a++) {
    balance += wallet[a].amount;
  }
  return balance;
}

function selectUTXOs(amount) {
  var inputs = [];
  var done = false;
  var remaining = amount;

  var selectUTXO = function (utxo){
    inputs.push(utxo.utxoId);
    remaining -= utxo.amount;
    if(remaining <= 0) {
      done = true;
    }
  }

  while(!done){
    var placeholder = {
      utxoId: 'placeholder',
      amount: remaining
    };

    var tempWallet = wallet
      .concat(placeholder)
      .sort(descending('amount'));

    var placeholderIndex = tempWallet.indexOf(placeholder);

    // try to get smallest utxo which is greater than `remaining`,
    // if `remaining` is greater than all utxos, get the largest utxo

    if(placeholderIndex > 0){
      selectUTXO(tempWallet[placeholderIndex - 1]);
    } else {
      selectUTXO(tempWallet[1]);
    }
  }
  return {
    inputs: inputs,
    change: remaining * -1
  };
}

function proposeSpend(amount) {
  if (getBalance() <= amount) {
    return false;
  }
  var proposalId = proposals.length;

  var utxoSelectionResult = selectUTXOs(amount);

  //fixed for simulation
  var fee = 1;

  proposals.push({
    id: proposalId,
    inputs: utxoSelectionResult.inputs,
    output: amount,
    change: utxoSelectionResult.change - fee,
    fee: fee
  });
  return proposalId;
}

function splitUtxo(utxo, amount){
  return {
    newUtxo: {},
    changeUtxo: {}
  };
}

function reject(proposalId) {

}

function accept(proposalId) {

}



// Utility functions

function status(message) {
  console.log(message);
  console.log("wallet:");
  console.log(wallet.sort(descending('amount')));
  console.log("proposals:");
  console.log(proposals);
  console.log("spent:");
  console.log(spent);
}

function ascending(prop) {
  return function(a, b) {
    if (a[prop] < b[prop])
      return -1;
    if (a[prop] > b[prop])
      return 1;
    return 0;
  };
}
function descending(prop) {
  return function(a, b) {
    if (a[prop] < b[prop])
      return -1;
    if (a[prop] > b[prop])
      return 1;
    return 0;
  };
}
