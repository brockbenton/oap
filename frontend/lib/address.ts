const ADDRESS_PREFIX_LEN = 6;
const ADDRESS_SUFFIX_LEN = 4;

export function shortenAddress(address: string): string {
  return `${address.slice(0, ADDRESS_PREFIX_LEN)}…${address.slice(-ADDRESS_SUFFIX_LEN)}`;
}
