export const ATTENDANCE_ABI = [
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
    name: 'TokenMinted',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'sessionId', type: 'uint256', indexed: true },
    ],
  },
] as const;
