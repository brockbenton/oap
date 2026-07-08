import { redirect } from 'next/navigation';

// Protocol content now lives on the Landing page under the #protocol section.
// Keep the old /protocol URL working by redirecting to that anchor.
export default function ProtocolPage() {
  redirect('/#protocol');
}
