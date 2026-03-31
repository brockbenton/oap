// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AttendanceRegistry} from "../src/AttendanceRegistry.sol";

contract Deploy is Script {
    function run() external {
        address relayWallet = vm.envAddress("RELAY_WALLET");
        string memory baseCid = vm.envString("BASE_CID");

        vm.startBroadcast();
        AttendanceRegistry registry = new AttendanceRegistry(relayWallet, baseCid);
        vm.stopBroadcast();

        console.log("AttendanceRegistry deployed at:", address(registry));
    }
}
