Full deployment pipeline for the AttendanceRegistry contract. Walk through every step in order. Do not skip steps. Confirm the target network before any on-chain action.

---

**Step 0 — Confirm target network**
Ask: "Deploying to Base Sepolia (testnet) or Base Mainnet? Type 'sepolia' or 'mainnet'."
Wait for confirmation before proceeding. If mainnet, add an extra warning.

---

**Step 1 — Pre-flight checks**
```bash
cd smart-contract
forge build
```
Build must pass with zero errors and zero warnings. If it fails, stop and report errors.

```bash
forge test -vv
```
All tests must pass. If any fail, stop. Do not deploy with failing tests.

---

**Step 2 — Verify environment**
Check that the following env vars are set in `smart-contract/.env`:
- `PRIVATE_KEY` — deployer wallet
- `ALCHEMY_API_KEY` — Base RPC
- `BASESCAN_API_KEY` — for contract verification

If any are missing, stop and list what's needed.

---

**Step 3 — Deploy**

For Base Sepolia:
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvv
```

For Base Mainnet:
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvv
```

Record the deployed contract address from the output.

---

**Step 4 — Grant roles**
After deployment, the deployer holds `DEFAULT_ADMIN_ROLE`. Grant the required roles:

```bash
# Grant RELAY_ROLE to the backend relay wallet
cast send <CONTRACT_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "RELAY_ROLE") \
  <RELAY_WALLET_ADDRESS> \
  --rpc-url <RPC_URL> \
  --private-key $PRIVATE_KEY

# Grant ADMIN_ROLE to each admin wallet
cast send <CONTRACT_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "ADMIN_ROLE") \
  <ADMIN_WALLET_ADDRESS> \
  --rpc-url <RPC_URL> \
  --private-key $PRIVATE_KEY
```

Confirm each transaction succeeds. Verify roles are set:
```bash
cast call <CONTRACT_ADDRESS> \
  "hasRole(bytes32,address)" \
  $(cast keccak "RELAY_ROLE") \
  <RELAY_WALLET_ADDRESS> \
  --rpc-url <RPC_URL>
```

---

**Step 5 — Update addresses.json**
Write the deployed address to `addresses.json` at the project root:
```json
{
  "AttendanceRegistry": {
    "sepolia": "<address or null>",
    "mainnet": "<address or null>"
  }
}
```

---

**Step 6 — Sync ABI**
Run `/sync-abi` to propagate the newly compiled ABI to frontend and backend.

---

**Step 7 — Update environment variables**
Remind the user to update:
- `backend/.env`: `CONTRACT_ADDRESS=<new address>`
- `frontend/.env.local`: `NEXT_PUBLIC_CONTRACT_ADDRESS=<new address>`
- `frontend/.env.local`: `NEXT_PUBLIC_CHAIN_ID=<84532 or 8453>`

---

**Step 8 — Verify on Basescan**
Provide the Basescan link:
- Sepolia: `https://sepolia.basescan.org/address/<address>`
- Mainnet: `https://basescan.org/address/<address>`

Confirm the contract is verified (source code visible). If verification failed during deploy, run:
```bash
forge verify-contract <address> AttendanceRegistry \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY
```

---

**Final report:**
- Contract address
- Network
- Roles granted (relay wallet, admin wallets)
- Basescan link
- Any issues encountered
