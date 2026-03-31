// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {IAttendanceRegistry} from "./interfaces/IAttendanceRegistry.sol";

contract AttendanceRegistry is ERC1155, AccessControl, ReentrancyGuard, IAttendanceRegistry {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RELAY_ROLE = keccak256("RELAY_ROLE");

    // s_sessions[sessionId] — date == 0 means session does not exist
    mapping(uint256 => Session) private s_sessions;
    string private s_baseCid;

    constructor(address relayWallet, string memory baseCid) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(RELAY_ROLE, relayWallet);
        s_baseCid = baseCid;
    }

    // -------------------------------------------------------------------------
    // Admin actions
    // -------------------------------------------------------------------------

    function createSession(
        uint256 id,
        uint64 date,
        string calldata name,
        string calldata semester
    ) external onlyRole(ADMIN_ROLE) {
        // date == 0 is reserved as the sentinel for "session does not exist"
        if (date == 0) revert InvalidDate();
        if (s_sessions[id].date != 0) revert SessionAlreadyExists();
        s_sessions[id] = Session({date: date, name: name, semester: semester, active: true});
        emit SessionCreated(id, date, name, semester);
    }

    function closeSession(uint256 id) external onlyRole(ADMIN_ROLE) {
        if (s_sessions[id].date == 0) revert SessionDoesNotExist();
        if (!s_sessions[id].active) revert SessionNotActive();
        s_sessions[id].active = false;
        emit SessionClosed(id);
    }

    function setBaseCid(string calldata baseCid) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit BaseCidUpdated(s_baseCid, baseCid);
        s_baseCid = baseCid;
    }

    function setApprovalForAll(address, bool) public pure override {
        revert Soulbound();
    }

    // -------------------------------------------------------------------------
    // Relay action
    // -------------------------------------------------------------------------

    function mint(address to, uint256 sessionId) external nonReentrant onlyRole(RELAY_ROLE) {
        if (s_sessions[sessionId].date == 0) revert SessionDoesNotExist();
        if (!s_sessions[sessionId].active) revert SessionNotActive();
        if (balanceOf(to, sessionId) > 0) revert AlreadyCheckedIn();
        _mint(to, sessionId, 1, "");
        emit TokenMinted(to, sessionId);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    function uri(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked("ipfs://", s_baseCid, "/", Strings.toString(id), ".json"));
    }

    function getSession(uint256 id) external view returns (Session memory) {
        return s_sessions[id];
    }

    // -------------------------------------------------------------------------
    // Soulbound: revert all transfers except mints (from == address(0))
    // -------------------------------------------------------------------------

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        if (from != address(0)) revert Soulbound();
        super._update(from, to, ids, values);
    }

    // -------------------------------------------------------------------------
    // ERC165: resolve diamond conflict between ERC1155 and AccessControl
    // -------------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
