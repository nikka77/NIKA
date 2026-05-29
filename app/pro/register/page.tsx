import { redirect } from 'next/navigation';

export default function ProRegisterPage({ searchParams }: { searchParams?: Promise<{ domain?: string }> }) {
  // /pro/register → canonical /pro/inscription
  void searchParams;
  redirect('/pro/inscription');
}
