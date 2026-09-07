import React, { useState } from 'react'
import EmptyState from '@vibaar/ui/common/EmptyState'
import Button from '@vibaar/ui/common/Button'
import { useRouter } from 'next/navigation'

const AwaitingReview = () => {
    const router = useRouter()
    const [isNavigatingToVendors, setIsNavigatingToVendors] = useState(false)

    const handleExploreVendors = async () => {
        if (isNavigatingToVendors) return;
        setIsNavigatingToVendors(true);
        setTimeout(() => {
            router.push('/shop');
        }, 100);
    }
  return (
<div className='mt-8'>

<EmptyState
  title="No Product to review yet"
  subtitle="Explore the store pages to review product"
  image="/images/emptystate/awaiting.svg">
  <Button 
    variant="bordered" 
    type="button" 
    onClick={handleExploreVendors} 
    loading={isNavigatingToVendors}
    loadingText="Loading vendors..."
    size="sm"
            fullWidth={false}
  >
    Explore vendors
  </Button>
</EmptyState>

</div>  )
}

export default AwaitingReview