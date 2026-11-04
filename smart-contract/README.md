## Foundry

## OCP Club DAO v1 (planned)

The deployed legacy registry records permanent soulbound attendance tokens. The planned v1 DAO additionally awards **10 nominal Rep per verified eligible attendance**, after two-officer approval, with gradual decay of voting influence. A **180-day half-life is provisional**; lifetime attendance does not decay. Voting uses fixed historical snapshots. There are no supply-based session reductions, weekly Rep budgets/caps or deferred claims. Decay-aware IVotes and math/history tests are required; ordinary OZ Votes checkpoints do not decay automatically. See [the master plan](../MASTER_PLAN.md#phase-5--club-dao-v1-our-club) and [contract conventions](CLAUDE.md). The commands below are tooling reference, not evidence these new contracts exist.

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

