'use client';
import dynamic from 'next/dynamic';

const Loader = dynamic(() => import('./Loader'), { ssr: false });

export default function LoaderClient() {
  return <Loader />;
}
