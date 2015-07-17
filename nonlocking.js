//simulate Copay multisig wallet
var walletState = [];

var unsignedTransactions = [];
var broadcastedTransactions = [];

var proposals = [];
var potentialSplits = [];

var feesSpent = 0;
var otherWallets = [];

var debug = true;

//start simulation
receive(100000);
// status('=========== received 100000 ===========');
var txA = proposeSpend(500);
var txB = proposeSpend(1000);
// var txC = proposeSpend(50);
// // status('=========== TXs proposed ===========');
// accept(txA);
// reject(txC);
// accept(txB);
// status('=========== final ===========');


// end simulation




// wallet logic

function receive(amount) {
  var trasaction = {
    utxoId: walletState.length,
    amount: amount
  };
  walletState.push(trasaction);
  debugMsg('received transaction: ', trasaction);
}

function getLockedUtxoIds() {
  var lockedIds = [];
  for (var a = 0; a < potentialSplits.length; a++) {
    lockedIds.push(potentialSplits[a].lock);
  }
  return lockedIds;
}

function getUnlockedBalance() {
  var balance = 0;
  var lockedIds = getLockedUtxoIds();
  // get unlocked utxos
  for (var a = 0; a < walletState.length; a++) {
    if (lockedIds.indexOf(walletState[a].utxoId) === -1) {
      balance += walletState[a].amount;
    }
  }
  for (var a = 0; a < potentialSplits.length; a++) {
    balance += potentialSplits[a].changeUtxoAmount;
  }
  debugMsg('Unlocked wallet balance: ', balance);
  return balance;
}

function selectUTXOs(amount) {
  debugMsg('selecting UTXOs for amount: ', amount);
  var inputIds = [];
  var done = false;
  var remaining = amount;
  var lockedIds = getLockedUtxoIds();
  var utxosFromSplits = false;
  var filterUtxos = function(utxo) {
    // filter out utxos already used
    if (inputIds.indexOf(utxo.utxoId) !== -1) {
      return false;
    }
    // filter out utxos locked by other proposals
    return lockedIds.indexOf(utxo.utxoId) === -1;
  };

  while (remaining >= 0) {
    var tempWallet;
    if (utxosFromSplits) {
      // reuse utxos from splits in selection
      tempWallet = tempWallet.concat(utxosFromSplits);
    } else {
      tempWallet = walletState.filter(filterUtxos);
      if (tempWallet.length === 0) {
        // need to use utxos from splits
        utxosFromSplits = [];
        for (var s = 0; s < potentialSplits.length; s++) {
          utxosFromSplits.push({
            utxoId: 's' + potentialSplits[s].splitId,
            amount: potentialSplits[s].changeUtxoAmount
          });
          tempWallet = tempWallet.concat(utxosFromSplits);
        }
      }
    }
    var placeholder = {
      utxoId: 'amount needed',
      amount: remaining
    };
    tempWallet = tempWallet
      .concat(placeholder)
      .sort(descending('amount'));
    debugMsg('Sorted tempWallet: ');
    debugMsg(tempWallet);
    var placeholderIndex = tempWallet.indexOf(placeholder);
    // try to get smallest utxo which is greater than `remaining`,
    // if `remaining` is greater than all utxos, get the largest utxo
    var selectedUtxo;
    if (placeholderIndex > 0) {
      selectedUtxo = tempWallet[placeholderIndex - 1];
    } else {
      selectedUtxo = tempWallet[1];
    }
    inputIds.push(selectedUtxo.utxoId);
    remaining -= selectedUtxo.amount;
  }
  var change = remaining * -1;
  debugMsg('selected UTXOs: ', inputIds);
  debugMsg('    change: ', change);
  return {
    inputIds: inputIds,
    change: change
  };
}

function proposeSpend(amount) {
  debugMsg('Proposing spend of: ', amount);
  var walletBalance = getUnlockedBalance();
  if (walletBalance <= amount) {
    console.error('Insufficient unlocked funds. Wallet balance is: ', walletBalance, ' – Proposed amount is: ', amount);
    return false;
  }
  debugMsg('Sufficient funds, proceeding...');
  var proposalId = proposals.length;
  // select UTXOs
  var utxoSelectionResult = selectUTXOs(amount);
  //fee fixed for simulation
  var fee = 100;

  //TODO: split change, using as few inputs as possible from the first X inputs in result

  var largestSelectedUtxo;

  if(utxoSelectionResult.inputIds[0].toString().charAt(0) === 's'){
    // largest UTXO is from split
  }

  for (var i = 0; i < walletState.length; i++) {
    if (walletState[i].utxoId === utxoSelectionResult.inputIds[0]) {
      largestSelectedUtxo = i;
      break;
    }
  }
  var splitUtxos = prepareSplit(largestSelectedUtxo, utxoSelectionResult.change - fee);

  proposals.push({
    id: proposalId,
    inputs: utxoSelectionResult.inputIds,
    output: amount,
    change: utxoSelectionResult.change - fee,
    fee: fee
  });
  return proposalId;
}


// TODO: this function actually needs to combine as many inputs as necessary to
// output a utxo for the proposal and the change it will produce

function prepareSplit(utxo, change) {
  debugMsg('Preparing split – change: ', change, ' from UTXO: ', utxo);
  var split = {
    splitId: potentialSplits.length,
    lock: utxo,
    newUtxoAmount: walletState[utxo].amount - change,
    changeUtxoAmount: change
  };
  potentialSplits.push(split);
  debugMsg('Saved potential split:');
  debugMsg(split);
  return split;
}

function reject(proposalId) {

}

function accept(proposalId) {

}



// Utility functions

function status(message) {
  console.log(message);
  console.log("wallet:");
  console.log(walletState.sort(descending('amount')));
  console.log("proposals:");
  console.log(proposals.sort(descending('output')));
  console.log("potentialSplits:");
  console.log(potentialSplits);
  console.log("broadcastedTransactions:");
  console.log(broadcastedTransactions);
  console.log("feesSpent:");
  console.log(feesSpent);
  console.log("otherWallets:");
  console.log(otherWallets.sort(descending('amount')));
}

function debugMsg() {
  if (debug) {
    console.log.apply(console, arguments);
  }
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
      return 1;
    if (a[prop] > b[prop])
      return -1;
    return 0;
  };
}
