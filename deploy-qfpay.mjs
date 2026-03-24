/**
 * QFPayRouter Deployment Script for QF Network Mainnet
 * 
 * Usage:
 *   1. Compile first: ./scripts/compile-revive.sh
 *   2. Install deploy deps: npm install --no-save @polkadot/api @polkadot/keyring @polkadot/util-crypto @polkadot/util ethers
 *   3. Run: DEPLOYER_SEED="your twelve word mnemonic here" node deploy-qfpay.mjs
 * 
 * This script deploys QFPayRouter with burn address 0x000000000000000000000000000000000000dEaD
 * and uses { withSignedTransaction: false } to bypass CheckMetadataHash (required for QF Network).
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { readFileSync, existsSync } from 'fs';
import { ethers } from 'ethers';

// --- Configuration ---
const RPC_URL = process.env.QF_RPC_URL || 'wss://mainnet.qfnode.net';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED;
const BURN_ADDRESS = process.env.BURN_ADDRESS || '0x000000000000000000000000000000000000dEaD';
const COMBINED_JSON_PATH = 'contracts/combined.json';

if (!DEPLOYER_SEED) {
  console.error('ERROR: DEPLOYER_SEED environment variable is required');
  console.error('Usage: DEPLOYER_SEED="your mnemonic" node deploy-qfpay.mjs');
  process.exit(1);
}

// --- Load contract artifact from combined.json ---
function loadContractArtifact(contractName) {
  if (!existsSync(COMBINED_JSON_PATH)) {
    console.error(`ERROR: ${COMBINED_JSON_PATH} not found`);
    console.error('Run ./scripts/compile-revive.sh first');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(COMBINED_JSON_PATH, 'utf-8'));

  if (!raw.contracts) {
    console.error('ERROR: combined.json has no "contracts" key');
    process.exit(1);
  }

  const contractKey = Object.keys(raw.contracts).find(k => {
    const parts = k.split(':');
    return parts[parts.length - 1] === contractName;
  });

  if (!contractKey) {
    console.error(`ERROR: Contract "${contractName}" not found in combined.json`);
    console.error('Available contracts:', Object.keys(raw.contracts).join(', '));
    process.exit(1);
  }

  const contractData = raw.contracts[contractKey];
  const abi = typeof contractData.abi === 'string' ? JSON.parse(contractData.abi) : contractData.abi;
  const bytecode = contractData.bin.startsWith('0x') ? contractData.bin : '0x' + contractData.bin;

  return { abi, bytecode };
}

// --- Deploy a contract ---
function deployContract(api, deployer, contractName, artifact, constructorArgs, options) {
  return new Promise((resolve, reject) => {
    const { gasLimit, storageDepositLimit } = options;

    console.log(`\nDeploying ${contractName}...`);
    console.log(`  Constructor args: ${JSON.stringify(constructorArgs)}`);
    console.log(`  Bytecode size: ${Math.round(artifact.bytecode.length / 2)} bytes`);

    // ABI-encode constructor arguments
    const iface = new ethers.Interface(artifact.abi);
    const encodedArgs = iface.encodeDeploy(constructorArgs);
    // Remove 0x prefix from encoded args and append to bytecode
    const data = encodedArgs === '0x' ? '0x' : '0x' + encodedArgs.slice(2);
    const code = artifact.bytecode;

    console.log(`  Encoded constructor data: ${data.length > 66 ? data.slice(0, 66) + '...' : data}`);

    const tx = api.tx.revive.instantiateWithCode(
      BigInt(0),              // value (no QF sent with deployment)
      gasLimit,               // Weight { refTime, proofSize }
      storageDepositLimit,    // storage deposit limit
      code,                   // hex bytecode
      data,                   // ABI-encoded constructor args
      null                    // salt (null = auto)
    );

    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, events, dispatchError, txHash }) => {
      console.log(`  Transaction hash: ${txHash.toHex()}`);

      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`Deploy failed: ${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(`Deploy failed: ${dispatchError.toString()}`));
        }
        return;
      }

      if (status.isInBlock) {
        console.log(`  Included in block: ${status.asInBlock.toHex()}`);
      }

      if (status.isFinalized) {
        console.log(`  Finalized in block: ${status.asFinalized.toHex()}`);

        // Extract contract address from revive.Instantiated event
        let contractAddress = null;
        events.forEach(({ event }) => {
          if (event.section === 'revive' && event.method === 'Instantiated') {
            // The event has fields: deployer, contract
            const data = event.data;
            if (data.contract) {
              contractAddress = data.contract.toString();
            } else if (data.length >= 2) {
              contractAddress = data[1].toString();
            }
            console.log(`  Contract address (raw): ${contractAddress}`);
          }

          // Log all events for debugging
          console.log(`  Event: ${event.section}.${event.method}`);
        });

        if (contractAddress) {
          // Convert H160 to 0x hex address if needed
          let hexAddress = contractAddress;
          if (!hexAddress.startsWith('0x')) {
            hexAddress = '0x' + hexAddress;
          }
          // Ensure lowercase
          hexAddress = hexAddress.toLowerCase();

          console.log(`\n  ✅ ${contractName} deployed at: ${hexAddress}`);
          resolve(hexAddress);
        } else {
          reject(new Error('Contract address not found in events. Check events above.'));
        }
      }
    }).catch(reject);
  });
}

// --- Map deployer account ---
function mapAccount(api, deployer) {
  return new Promise((resolve, reject) => {
    console.log('Mapping deployer account (revive.mapAccount)...');

    const tx = api.tx.revive.mapAccount();

    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, dispatchError }) => {
      if (dispatchError) {
        // If already mapped, that's fine
        if (dispatchError.toString().includes('AccountAlreadyMapped') || 
            dispatchError.toString().includes('already')) {
          console.log('  Account already mapped, continuing...');
          resolve();
          return;
        }
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          // AccountAlreadyMapped is not an error for us
          if (decoded.name === 'AccountAlreadyMapped') {
            console.log('  Account already mapped, continuing...');
            resolve();
            return;
          }
          reject(new Error(`mapAccount failed: ${decoded.section}.${decoded.name}`));
        } else {
          reject(new Error(`mapAccount failed: ${dispatchError.toString()}`));
        }
        return;
      }

      if (status.isFinalized) {
        console.log('  Account mapped successfully');
        resolve();
      }
    }).catch(err => {
      // Some versions throw on already-mapped
      if (err.message && err.message.includes('AlreadyMapped')) {
        console.log('  Account already mapped, continuing...');
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

// --- Main ---
async function main() {
  console.log('=== QFPayRouter Deployment ===');
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Burn address: ${BURN_ADDRESS}`);
  console.log('');

  // Connect to chain
  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ provider });
  await api.isReady;

  const chain = await api.rpc.system.chain();
  console.log(`Connected to: ${chain}`);

  // Load deployer
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(DEPLOYER_SEED);
  console.log(`Deployer SS58: ${deployer.address}`);

  // Check balance
  const { data: balance } = await api.query.system.account(deployer.address);
  const freeBalance = balance.free.toBigInt();
  console.log(`Deployer balance: ${Number(freeBalance / BigInt(1e12)) / 1e6} QF`);

  if (freeBalance < BigInt(10e18)) {
    console.error('ERROR: Deployer balance too low. Need at least 10 QF.');
    process.exit(1);
  }

  // Map deployer account first
  await mapAccount(api, deployer);

  // Calculate gas limits (75% of max extrinsic weight, same as QNS)
  const blockWeights = api.consts.system.blockWeights;
  const maxExtrinsic = blockWeights.perClass.normal.maxExtrinsic.unwrap();
  const deployRefTime = maxExtrinsic.refTime.toBigInt() * 75n / 100n;
  const deployProofSize = maxExtrinsic.proofSize.toBigInt() * 75n / 100n;
  const gasLimit = api.registry.createType('Weight', {
    refTime: deployRefTime,
    proofSize: deployProofSize,
  });
  const storageDepositLimit = freeBalance / 10n;

  console.log(`\nGas limit: refTime=${deployRefTime}, proofSize=${deployProofSize}`);
  console.log(`Storage deposit limit: ${storageDepositLimit}`);

  // Load artifact
  const artifact = loadContractArtifact('QFPayRouter');
  console.log(`\nLoaded QFPayRouter artifact`);
  console.log(`  ABI functions: ${artifact.abi.filter(x => x.type === 'function').map(x => x.name).join(', ')}`);
  console.log(`  Bytecode size: ${Math.round(artifact.bytecode.length / 2)} bytes`);

  // Deploy QFPayRouter with burn address as constructor arg
  const routerAddress = await deployContract(
    api,
    deployer,
    'QFPayRouter',
    artifact,
    [BURN_ADDRESS],  // constructor arg: _burnAddress
    { gasLimit, storageDepositLimit }
  );

  // Summary
  console.log('\n========================================');
  console.log('  DEPLOYMENT COMPLETE');
  console.log('========================================');
  console.log(`  QFPayRouter: ${routerAddress}`);
  console.log(`  Burn address: ${BURN_ADDRESS}`);
  console.log('========================================');
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Update .env.production:`);
  console.log(`     VITE_QFPAY_ROUTER_ADDRESS=${routerAddress}`);
  console.log(`  2. Rebuild frontend: npm run build`);
  console.log(`  3. Test a payment on the live site`);
  console.log('');

  await api.disconnect();
}

main().catch(err => {
  console.error('\nDEPLOYMENT FAILED:', err.message || err);
  process.exit(1);
});
