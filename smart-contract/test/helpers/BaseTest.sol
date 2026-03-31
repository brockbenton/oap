// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AttendanceRegistry} from "../../src/AttendanceRegistry.sol";

contract BaseTest is Test {
    AttendanceRegistry internal registry;

    address internal deployer = makeAddr("deployer");
    address internal admin = makeAddr("admin");
    address internal relay = makeAddr("relay");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    string internal constant BASE_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    string internal constant NEW_CID = "bafkreihdwdcefgh4dqkjv67uzcmw37nvr7ww56bhkjknt9astkhkumzumq";

    uint256 internal constant SESSION_ID = 1;
    uint64 internal constant SESSION_DATE = 1_700_000_000;
    string internal constant SESSION_NAME = "Intro to Blockchain";
    string internal constant SESSION_SEMESTER = "Fall 2024";

    function setUp() public virtual {
        vm.startPrank(deployer);
        registry = new AttendanceRegistry(relay, BASE_CID);

        // Grant ADMIN_ROLE to dedicated admin address
        registry.grantRole(registry.ADMIN_ROLE(), admin);
        vm.stopPrank();
    }

    /// @dev Convenience helper: creates a single active session with default constants.
    function _createActiveSession() internal {
        vm.prank(admin);
        registry.createSession(SESSION_ID, SESSION_DATE, SESSION_NAME, SESSION_SEMESTER);
    }

    /// @dev Convenience helper: creates and immediately closes a session.
    function _createClosedSession() internal {
        _createActiveSession();
        vm.prank(admin);
        registry.closeSession(SESSION_ID);
    }
}
