// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {AttendanceRegistry} from "../src/AttendanceRegistry.sol";
import {IAttendanceRegistry} from "../src/interfaces/IAttendanceRegistry.sol";
import {BaseTest} from "./helpers/BaseTest.sol";

// ---------------------------------------------------------------------------
// Malicious ERC-1155 receiver used to test reentrancy guard on mint()
// It holds RELAY_ROLE itself so the re-entrant mint() call passes role check
// and is stopped only by ReentrancyGuard.
// ---------------------------------------------------------------------------
contract ReentrantReceiver {
    AttendanceRegistry private immutable target;
    uint256 private immutable sessionId;
    bool private attacked;

    constructor(AttendanceRegistry _target, uint256 _sessionId) {
        target = _target;
        sessionId = _sessionId;
    }

    /// @dev ERC-1155 single-receive hook — attempts to re-enter mint() on receipt.
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        returns (bytes4)
    {
        if (!attacked) {
            attacked = true;
            // This re-entrant call should revert due to ReentrancyGuard, not AccessControl.
            target.mint(address(this), sessionId);
        }
        return this.onERC1155Received.selector;
    }

    /// @dev Allow this contract to initiate the first mint as the relay caller.
    function attack() external {
        target.mint(address(this), sessionId);
    }
}

// ---------------------------------------------------------------------------
// Main test contract
// ---------------------------------------------------------------------------
contract AttendanceRegistryTest is BaseTest {
    // Cache role constants to avoid consuming vm.prank with static calls inside
    // abi.encodeWithSelector — fetching registry.ADMIN_ROLE() inside expectRevert()
    // would consume the prank before the actual call under test.
    bytes32 private adminRole;
    bytes32 private relayRole;
    bytes32 private defaultAdminRole;

    function setUp() public override {
        super.setUp();
        adminRole = registry.ADMIN_ROLE();
        relayRole = registry.RELAY_ROLE();
        defaultAdminRole = registry.DEFAULT_ADMIN_ROLE();
    }

    // =========================================================================
    // createSession — role access
    // =========================================================================

    function test_createSession_revertsIfCallerLacksAdminRole() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                alice,
                adminRole
            )
        );
        vm.prank(alice);
        registry.createSession(SESSION_ID, SESSION_DATE, SESSION_NAME, SESSION_SEMESTER);
    }

    function test_createSession_relayCannotCreate() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                relay,
                adminRole
            )
        );
        vm.prank(relay);
        registry.createSession(SESSION_ID, SESSION_DATE, SESSION_NAME, SESSION_SEMESTER);
    }

    // =========================================================================
    // createSession — happy path
    // =========================================================================

    function test_createSession_storesCorrectFields() public {
        _createActiveSession();

        IAttendanceRegistry.Session memory session = registry.getSession(SESSION_ID);
        assertEq(session.date, SESSION_DATE);
        assertEq(session.name, SESSION_NAME);
        assertEq(session.semester, SESSION_SEMESTER);
        assertTrue(session.active);
    }

    function test_createSession_emitsSessionCreatedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IAttendanceRegistry.SessionCreated(SESSION_ID, SESSION_DATE, SESSION_NAME, SESSION_SEMESTER);
        vm.prank(admin);
        registry.createSession(SESSION_ID, SESSION_DATE, SESSION_NAME, SESSION_SEMESTER);
    }

    // =========================================================================
    // createSession — revert conditions
    // =========================================================================

    function test_createSession_revertsIfDateIsZero() public {
        vm.expectRevert(IAttendanceRegistry.InvalidDate.selector);
        vm.prank(admin);
        registry.createSession(SESSION_ID, 0, SESSION_NAME, SESSION_SEMESTER);
    }

    function test_createSession_revertsIfSessionIdAlreadyExists() public {
        _createActiveSession();

        vm.expectRevert(IAttendanceRegistry.SessionAlreadyExists.selector);
        vm.prank(admin);
        registry.createSession(SESSION_ID, SESSION_DATE, "Duplicate", SESSION_SEMESTER);
    }

    function test_createSession_revertsIfClosedSessionIdReused() public {
        _createClosedSession();

        // Closed sessions still occupy the mapping (date != 0), so reuse must revert.
        vm.expectRevert(IAttendanceRegistry.SessionAlreadyExists.selector);
        vm.prank(admin);
        registry.createSession(SESSION_ID, SESSION_DATE, "Reuse After Close", SESSION_SEMESTER);
    }

    // =========================================================================
    // createSession — fuzz
    // =========================================================================

    function testFuzz_createSession_anyNonZeroDateAndId(uint256 id, uint64 date) public {
        vm.assume(date != 0);
        vm.prank(admin);
        registry.createSession(id, date, "Fuzz Session", "Fuzz Semester");

        IAttendanceRegistry.Session memory session = registry.getSession(id);
        assertEq(session.date, date);
        assertTrue(session.active);
    }

    // =========================================================================
    // closeSession — role access
    // =========================================================================

    function test_closeSession_revertsIfCallerLacksAdminRole() public {
        _createActiveSession();

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                alice,
                adminRole
            )
        );
        vm.prank(alice);
        registry.closeSession(SESSION_ID);
    }

    // =========================================================================
    // closeSession — happy path
    // =========================================================================

    function test_closeSession_setsActiveFalse() public {
        _createActiveSession();

        vm.prank(admin);
        registry.closeSession(SESSION_ID);

        IAttendanceRegistry.Session memory session = registry.getSession(SESSION_ID);
        assertFalse(session.active);
    }

    function test_closeSession_emitsSessionClosedEvent() public {
        _createActiveSession();

        vm.expectEmit(true, false, false, false);
        emit IAttendanceRegistry.SessionClosed(SESSION_ID);
        vm.prank(admin);
        registry.closeSession(SESSION_ID);
    }

    // =========================================================================
    // closeSession — revert conditions
    // =========================================================================

    function test_closeSession_revertsIfSessionDoesNotExist() public {
        vm.expectRevert(IAttendanceRegistry.SessionDoesNotExist.selector);
        vm.prank(admin);
        registry.closeSession(999);
    }

    function test_closeSession_revertsIfAlreadyClosed() public {
        _createClosedSession();

        vm.expectRevert(IAttendanceRegistry.SessionNotActive.selector);
        vm.prank(admin);
        registry.closeSession(SESSION_ID);
    }

    // =========================================================================
    // mint — role access
    // =========================================================================

    function test_mint_revertsIfCallerLacksRelayRole() public {
        _createActiveSession();

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                alice,
                relayRole
            )
        );
        vm.prank(alice);
        registry.mint(alice, SESSION_ID);
    }

    function test_mint_adminCannotMintWithoutRelayRole() public {
        _createActiveSession();

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                admin,
                relayRole
            )
        );
        vm.prank(admin);
        registry.mint(alice, SESSION_ID);
    }

    // =========================================================================
    // mint — happy path
    // =========================================================================

    function test_mint_happyPath_balanceIsOne() public {
        _createActiveSession();

        vm.prank(relay);
        registry.mint(alice, SESSION_ID);

        assertEq(registry.balanceOf(alice, SESSION_ID), 1);
    }

    function test_mint_emitsTokenMintedEvent() public {
        _createActiveSession();

        vm.expectEmit(true, true, false, false);
        emit IAttendanceRegistry.TokenMinted(alice, SESSION_ID);
        vm.prank(relay);
        registry.mint(alice, SESSION_ID);
    }

    function test_mint_twoDifferentAddressesCanMintSameSession() public {
        _createActiveSession();

        vm.prank(relay);
        registry.mint(alice, SESSION_ID);

        vm.prank(relay);
        registry.mint(bob, SESSION_ID);

        assertEq(registry.balanceOf(alice, SESSION_ID), 1);
        assertEq(registry.balanceOf(bob, SESSION_ID), 1);
    }

    // =========================================================================
    // mint — revert conditions
    // =========================================================================

    function test_mint_revertsIfSessionDoesNotExist() public {
        vm.expectRevert(IAttendanceRegistry.SessionDoesNotExist.selector);
        vm.prank(relay);
        registry.mint(alice, 999);
    }

    function test_mint_revertsIfSessionIsClosed() public {
        _createClosedSession();

        vm.expectRevert(IAttendanceRegistry.SessionNotActive.selector);
        vm.prank(relay);
        registry.mint(alice, SESSION_ID);
    }

    function test_mint_revertsIfAlreadyCheckedIn() public {
        _createActiveSession();

        vm.prank(relay);
        registry.mint(alice, SESSION_ID);

        vm.expectRevert(IAttendanceRegistry.AlreadyCheckedIn.selector);
        vm.prank(relay);
        registry.mint(alice, SESSION_ID);
    }

    // =========================================================================
    // mint — reentrancy
    // =========================================================================

    function test_mint_nonReentrant_rejectsReentrantCall() public {
        _createActiveSession();

        // Deploy the malicious receiver. It will call mint() from inside the
        // ERC-1155 receive hook. We grant it RELAY_ROLE so that only
        // ReentrancyGuard — not AccessControl — can stop the nested call.
        ReentrantReceiver attacker = new ReentrantReceiver(registry, SESSION_ID);

        vm.prank(deployer);
        registry.grantRole(relayRole, address(attacker));

        // attacker.attack() calls mint(address(attacker), sessionId).
        // ERC-1155 calls onERC1155Received which tries to call mint() again.
        // ReentrancyGuard must revert the whole transaction.
        vm.expectRevert();
        attacker.attack();
    }

    // =========================================================================
    // Soulbound — transfer prevention
    // =========================================================================

    function test_soulbound_safeTransferFromReverts() public {
        _createActiveSession();
        vm.prank(relay);
        registry.mint(alice, SESSION_ID);

        vm.expectRevert(IAttendanceRegistry.Soulbound.selector);
        vm.prank(alice);
        registry.safeTransferFrom(alice, bob, SESSION_ID, 1, "");
    }

    function test_soulbound_safeBatchTransferFromReverts() public {
        _createActiveSession();
        vm.prank(relay);
        registry.mint(alice, SESSION_ID);

        uint256[] memory ids = new uint256[](1);
        ids[0] = SESSION_ID;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.expectRevert(IAttendanceRegistry.Soulbound.selector);
        vm.prank(alice);
        registry.safeBatchTransferFrom(alice, bob, ids, amounts, "");
    }

    function test_soulbound_setApprovalForAllReverts() public {
        vm.expectRevert(IAttendanceRegistry.Soulbound.selector);
        vm.prank(alice);
        registry.setApprovalForAll(bob, true);
    }

    // =========================================================================
    // uri
    // =========================================================================

    function test_uri_returnsCorrectFormat() public view {
        string memory expected = string(
            abi.encodePacked("ipfs://", BASE_CID, "/", "42", ".json")
        );
        assertEq(registry.uri(42), expected);
    }

    function test_uri_returnsCorrectFormatForSessionZero() public view {
        string memory expected = string(
            abi.encodePacked("ipfs://", BASE_CID, "/", "0", ".json")
        );
        assertEq(registry.uri(0), expected);
    }

    function test_uri_updatesAfterSetBaseCid() public {
        vm.prank(deployer);
        registry.setBaseCid(NEW_CID);

        string memory expected = string(
            abi.encodePacked("ipfs://", NEW_CID, "/", "1", ".json")
        );
        assertEq(registry.uri(1), expected);
    }

    // =========================================================================
    // setBaseCid — role access
    // =========================================================================

    function test_setBaseCid_revertsIfCallerLacksDefaultAdminRole() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                admin,
                defaultAdminRole
            )
        );
        vm.prank(admin);
        registry.setBaseCid(NEW_CID);
    }

    function test_setBaseCid_revertsIfRelayCallsIt() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                relay,
                defaultAdminRole
            )
        );
        vm.prank(relay);
        registry.setBaseCid(NEW_CID);
    }

    // =========================================================================
    // setBaseCid — happy path
    // =========================================================================

    function test_setBaseCid_updatesCid() public {
        vm.prank(deployer);
        registry.setBaseCid(NEW_CID);

        assertEq(
            registry.uri(SESSION_ID),
            string(abi.encodePacked("ipfs://", NEW_CID, "/", "1", ".json"))
        );
    }

    function test_setBaseCid_emitsBaseCidUpdatedEvent() public {
        vm.expectEmit(false, false, false, true);
        emit IAttendanceRegistry.BaseCidUpdated(BASE_CID, NEW_CID);
        vm.prank(deployer);
        registry.setBaseCid(NEW_CID);
    }

    function test_setBaseCid_emitsOldCidBeforeUpdate() public {
        // First update: old == BASE_CID, new == NEW_CID.
        vm.expectEmit(false, false, false, true);
        emit IAttendanceRegistry.BaseCidUpdated(BASE_CID, NEW_CID);
        vm.prank(deployer);
        registry.setBaseCid(NEW_CID);

        // Second update: old must now be NEW_CID, confirming the emit happened
        // before the storage write.
        string memory THIRD_CID = "bafkreiabcdef";
        vm.expectEmit(false, false, false, true);
        emit IAttendanceRegistry.BaseCidUpdated(NEW_CID, THIRD_CID);
        vm.prank(deployer);
        registry.setBaseCid(THIRD_CID);
    }

    // =========================================================================
    // getSession
    // =========================================================================

    function test_getSession_returnsCorrectSession() public {
        _createActiveSession();

        IAttendanceRegistry.Session memory session = registry.getSession(SESSION_ID);
        assertEq(session.date, SESSION_DATE);
        assertEq(session.name, SESSION_NAME);
        assertEq(session.semester, SESSION_SEMESTER);
        assertTrue(session.active);
    }

    function test_getSession_returnsZeroStructForNonExistentSession() public view {
        IAttendanceRegistry.Session memory session = registry.getSession(999);
        assertEq(session.date, 0);
        assertEq(bytes(session.name).length, 0);
        assertEq(bytes(session.semester).length, 0);
        assertFalse(session.active);
    }

    function test_getSession_reflectsClosedState() public {
        _createClosedSession();

        IAttendanceRegistry.Session memory session = registry.getSession(SESSION_ID);
        assertEq(session.date, SESSION_DATE);
        assertFalse(session.active);
    }

    // =========================================================================
    // supportsInterface
    // =========================================================================

    function test_supportsInterface_erc1155() public view {
        assertTrue(registry.supportsInterface(type(IERC1155).interfaceId));
    }

    function test_supportsInterface_accessControl() public view {
        assertTrue(registry.supportsInterface(type(IAccessControl).interfaceId));
    }

    function test_supportsInterface_returnsFalseForUnknown() public view {
        assertFalse(registry.supportsInterface(0xdeadbeef));
    }

    // =========================================================================
    // Role constants — sanity checks
    // =========================================================================

    function test_roles_deployerHasDefaultAdminRole() public view {
        assertTrue(registry.hasRole(defaultAdminRole, deployer));
    }

    function test_roles_deployerHasAdminRole() public view {
        assertTrue(registry.hasRole(adminRole, deployer));
    }

    function test_roles_relayHasRelayRole() public view {
        assertTrue(registry.hasRole(relayRole, relay));
    }

    function test_roles_adminHasAdminRole() public view {
        assertTrue(registry.hasRole(adminRole, admin));
    }

    function test_roles_aliceHasNoPrivilegedRole() public view {
        assertFalse(registry.hasRole(adminRole, alice));
        assertFalse(registry.hasRole(relayRole, alice));
        assertFalse(registry.hasRole(defaultAdminRole, alice));
    }

    // =========================================================================
    // Fuzz — mint uniqueness per address per session
    // =========================================================================

    function testFuzz_mint_revertsOnDoubleCheckIn(address recipient) public {
        vm.assume(recipient != address(0));
        // Avoid precompile addresses and contracts that may reject ERC-1155 tokens.
        vm.assume(recipient.code.length == 0);
        vm.assume(uint160(recipient) > 10);

        _createActiveSession();

        vm.prank(relay);
        registry.mint(recipient, SESSION_ID);

        vm.expectRevert(IAttendanceRegistry.AlreadyCheckedIn.selector);
        vm.prank(relay);
        registry.mint(recipient, SESSION_ID);
    }
}
