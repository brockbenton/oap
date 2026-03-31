// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAttendanceRegistry {
    struct Session {
        uint64 date;
        string name;
        string semester;
        bool active;
    }

    event SessionCreated(uint256 indexed sessionId, uint64 date, string name, string semester);
    event SessionClosed(uint256 indexed sessionId);
    event TokenMinted(address indexed to, uint256 indexed sessionId);
    event BaseCidUpdated(string oldCid, string newCid);

    error Soulbound();
    error SessionAlreadyExists();
    error SessionNotActive();
    error SessionDoesNotExist();
    error AlreadyCheckedIn();
    error InvalidDate();

    function createSession(uint256 id, uint64 date, string calldata name, string calldata semester) external;
    function closeSession(uint256 id) external;
    function mint(address to, uint256 sessionId) external;
    function setBaseCid(string calldata baseCid) external;
    function getSession(uint256 id) external view returns (Session memory);
}
