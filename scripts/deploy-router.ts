#!/usr/bin/env ts-node
/**
 * Deploy QFPayRouter to QF Network
 * 
 * Prerequisites:
 * 1. Compile with: ./scripts/compile-revive.sh
 * 2. Set environment variables in .env:
 *    - DEPLOYER_MNEMONIC: deployer account mnemonic
 *    - BURN_ADDRESS: the burn address for the 0.1% burn (EVM format 0x...)
 *    - QF_RPC_URL: QF Network RPC endpoint
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

config();

const RPC_URL = process.env.QF_RPC_URL || 'wss://mainnet.qfnode.net';
const MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const BURN_ADDRESS = process.env.BURN_ADDRESS;
const BYTECODE_PATH = process.env.ROUTER_BYTECODE_PATH || './output/QFPayRouter.polkavm';
const GAS_LIMIT = process.env.GAS_LIMIT || '100000000000';

async function deploy() {
  console.log('========================================');
  console.log('  QFPayRouter Deployment');
  console.log('========================================\n');

  if (!MNEMONIC) {
    console.error('❌ DEPLOYER_MNEMONIC not set in .env');
    process.exit(1);
  }

  if (!BURN_ADDRESS || BURN_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.error('❌ BURN_ADDRESS not set or is zero address');
    console.error('   This should be the same burn address QNS uses.');
    console.error('   Set BURN_ADDRESS in .env');
    process.exit(1);
  }

  try {
    // Connect
    console.log(`� Connecting to ${RPC_URL}...`);
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const chain = await api.rpc.system.chain();
    console.log(`✅ Connected to ${chain}\n`);

    // Load deployer
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromMnemonic(MNEMONIC);
    console.log(`🔑 Deployer: ${deployer.address}`);

    const { data: balance } = await api.query.system.account(deployer.address);
    const free = BigInt(balance.free.toString());
    console.log(`� Balance: ${(Number(free) / 1e18).toFixed(4)} QF\n`);

    if (free === 0n) {
      console.error('❌ Zero balance — fund the deployer account first');
      process.exit(1);
    }

    // Load bytecode
    const bytecodePath = resolve(BYTECODE_PATH);
    console.log(`📦 Loading bytecode from ${bytecodePath}...`);
    const bytecode = readFileSync(bytecodePath);
    console.log(`   Size: ${bytecode.length} bytes\n`);

    // Encode constructor argument (burn address)
    // The constructor takes a single address argument
    // ABI encode: pad the address to 32 bytes
    const burnAddrClean = BURN_ADDRESS.toLowerCase().replace('0x', '');
    const constructorData = '0x' + burnAddrClean.padStart(64, '0');
    
    // Concatenate bytecode + constructor args
    const deployData = '0x' + bytecode.toString('hex') + constructorData.slice(2);

    console.log(`🔥 Burn address: ${BURN_ADDRESS}`);
    console.log(`🚀 Deploying QFPayRouter...\n`);

    // Deploy via revive.instantiate_with_code or revive.instantiate
    // Using the Revive pallet's instantiate call
    const gasLimit = { ref_time: BigInt(GAS_LIMIT), proof_size: 5_000_000n };

    const tx = api.tx.revive.instantiateWithCode(
      0,              // value (no QF sent with deployment)
      gasLimit,       // gas limit
      0,              // storage deposit limit
      `0x${bytecode.toString('hex')}`, // code
      constructorData, // constructor data (ABI-encoded burn address)
      null             // salt (optional)
    );

    console.log('⏳ Signing and submitting...\n');

    const result = await new Promise<any>((resolve, reject) => {
      tx.signAndSend(deployer, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        if (status.isInBlock) {
          console.log(`📦 In block: ${status.asInBlock.toHex()}`);
        }

        if (status.isFinalized) {
          console.log(`✅ Finalized: ${status.asFinalized.toHex()}\n`);

          let contractAddress: string | null = null;

          events.forEach(({ event }: any) => {
            if (event.section === 'revive' && event.method === 'Instantiated') {
              // The second data field is typically the contract address
              contractAddress = event.data[1]?.toString();
            }
          });

          resolve({ blockHash: status.asFinalized.toHex(), contractAddress, events });
        }
      }).catch(reject);
    });

    console.log('========================================');
    console.log('  ✅ QFPayRouter Deployed!');
    console.log('========================================\n');
    console.log(`📍 Contract Address: ${result.contractAddress || 'Check events manually'}`);
    console.log(`🔗 Block: ${result.blockHash}\n`);
    console.log('📋 Next steps:');
    console.log(`   1. Update .env: VITE_QFPAY_ROUTER_ADDRESS=${result.contractAddress}`);
    console.log('   2. Restart the dev server');
    console.log('   3. Test a send transaction\n');

    // Log all events for debugging
    console.log('📋 All events:');
    result.events.forEach(({ event }: any) => {
      console.log(`   ${event.section}.${event.method}: ${event.data.toString()}`);
    });

    await api.disconnect();
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Deployment failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

deploy();
