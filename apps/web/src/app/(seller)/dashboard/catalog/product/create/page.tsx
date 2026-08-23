"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Index = () => {
    const router = useRouter();

    useEffect(() => {
        // Redirect directly to manual product creation
        router.replace('/dashboard/catalog/product/create/manual');
    }, [router]);
};

export default Index;