#!/bin/bash
# Compile QFPayRouter.sol using resolc for PolkaVM deployment
# Usage: ./scripts/compile-revive.sh

set -e

CONTRACT="contracts/QFPayRouter.sol"
OUTPUT_DIR="output"

echo "========================================"
echo "  QFPayRouter — Revive Compilation"
echo "========================================"

# Check resolc is installed
if ! command -v resolc &> /dev/null; then
    echo "❌ resolc not found. Install the Revive compiler:"
    echo "   cargo install --git https://github.com/aspect-build/revive resolc"
    echo "   or download from: https://github.com/aspect-build/revive/releases"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "📦 Compiling $CONTRACT..."
echo ""

# Compile with resolc targeting PolkaVM
# --bin outputs the bytecode, --abi outputs the ABI
resolc "$CONTRACT" --output-dir "$OUTPUT_DIR" --overwrite --bin --abi

echo ""
echo "✅ Compilation successful!"
echo ""
echo "Output files:"
ls -la "$OUTPUT_DIR"/

echo ""
echo "Next step: Deploy with ./scripts/deploy-router.ts"
echo "   Set DEPLOYER_MNEMONIC and BURN_ADDRESS in .env first"
