#!/bin/bash
set -e

echo "=== QFPayRouter Compilation ==="
echo ""

# Check for resolc
if ! command -v resolc &> /dev/null; then
    if [ ! -f "../resolc" ]; then
        echo "ERROR: resolc not found in PATH or as ../resolc"
        echo ""
        echo "Install resolc (the Revive Solidity compiler for PolkaVM):"
        echo "  Download from: https://github.com/paritytech/revive/releases"
        echo "  For macOS: download resolc-universal-apple-darwin, then run:"
        echo "    chmod +x resolc-universal-apple-darwin"
        echo "    xattr -c resolc-universal-apple-darwin"
        echo "    sudo mv resolc-universal-apple-darwin /usr/local/bin/resolc"
        echo "  For Linux: download resolc-x86_64-unknown-linux-gnu, then run:"
        echo "    chmod +x resolc-x86_64-unknown-linux-gnu"
        echo "    sudo mv resolc-x86_64-unknown-linux-gnu /usr/local/bin/resolc"
        echo ""
        exit 1
    else
        RESOLC="../resolc"
    fi
else
    RESOLC="resolc"
fi

echo "Using resolc version:"
$RESOLC --version
echo ""

# Compile QFPayRouter
echo "Compiling contracts/QFPayRouter.sol..."
$RESOLC contracts/QFPayRouter.sol --combined-json abi,bin -o contracts/ --overwrite

echo ""
if [ -f "contracts/combined.json" ]; then
    echo "SUCCESS: contracts/combined.json created"
    echo "File size: $(wc -c < contracts/combined.json) bytes"
else
    echo "ERROR: contracts/combined.json was not created"
    exit 1
fi

echo ""
echo "Next step: run deployment with"
echo "  DEPLOYER_SEED=\"your mnemonic\" node deploy-qfpay.mjs"
