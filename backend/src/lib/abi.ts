// Minimal ABI for AttendanceRegistry — only functions and events used by the backend.
export const ATTENDANCE_ABI = [
  {
    type: 'function',
    name: 'createSession',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'date', type: 'uint64' },
      { name: 'name', type: 'string' },
      { name: 'semester', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'closeSession',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'sessionId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSession',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'date', type: 'uint64' },
          { name: 'name', type: 'string' },
          { name: 'semester', type: 'string' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'SessionCreated',
    inputs: [
      { name: 'sessionId', type: 'uint256', indexed: true },
      { name: 'date', type: 'uint64', indexed: false },
      { name: 'name', type: 'string', indexed: false },
      { name: 'semester', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SessionClosed',
    inputs: [{ name: 'sessionId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'TokenMinted',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'sessionId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'error',
    name: 'SessionAlreadyExists',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SessionDoesNotExist',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SessionNotActive',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AlreadyCheckedIn',
    inputs: [],
  },
] as const;
