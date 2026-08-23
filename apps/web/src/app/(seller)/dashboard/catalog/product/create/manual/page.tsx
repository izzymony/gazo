"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loader from '@/design-system/common/Loader';

export default function ManualProductRouter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('edit');

  useEffect(() => {
    if (productId) {
      // Editing existing product - use full editor
      router.replace(`/dashboard/catalog/product/create/manual/edit/${productId}`);
    } else {
      // Creating new product - use progressive flow
      router.replace('/dashboard/catalog/product/create/manual/new');
    }
  }, [router, productId]);

  return <Loader />;
}