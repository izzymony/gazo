/* eslint-disable @next/next/no-img-element */
"use client"
import React from 'react'
import { BsThreeDots, MdOutlineAddCard } from "@vibaar/ui/icons";
import { useRouter } from 'next/navigation';
import PageShell from '@vibaar/ui/PageShell'
import Header from '@/design-system/common/Header'
import Surface from '@vibaar/ui/common/Surface'
import Section from '@vibaar/ui/common/Section'



const Billing = () => {
    const router = useRouter();

    return (
        <PageShell
          header={
            <Header
              showBack
              onBackClick={() => router.back()}
              customText="Billing"
            />
          }>
            <Section title="Current plan">
                <Surface>
                    <div className='flex justify-between'>
                        <p className='font-medium'>Booster</p>
                        <p className='text-brandDeep text-body-sm'>Change plan</p>
                    </div>

                    <p className="text-foreground-muted text-body">₦2,300/month</p>

                    <p className='text-body'> <span className="text-foreground-secondary"> Next billing:</span>  20 Jul 2024</p>
                </Surface>
            </Section>

            <Section title="Billing cards">
                <Surface className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-3">
                            <img src={'/images/vendor/visa.png'} alt="Visa" className="w-8 h-5 object-contain" />
                            <div>
                                <span className='text-body font-medium text-foreground-primary'>Mastercard-1243</span>
                                <span className="text-brandDeep ml-2 border border-brandDeep rounded-pill px-2 bg-brand/10 text-caption font-normal">Default</span>
                                <p className="text-body font-normal text-foreground-secondary">02/29</p>
                            </div>
                        </div>
                    </div>

                    <BsThreeDots className='cursor-pointer' />
                </Surface>
                <Surface className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-3">
                            <img src={'/images/vendor/mastercard.png'} alt="Mastercard" className="w-8 h-5 object-contain" />
                            <div>
                                <span className='text-body font-medium text-foreground-primary'>Visacard-1243</span>
                                <span className="text-brandDeep ml-2 border border-brandDeep rounded-pill px-2 bg-brand/10 text-caption font-normal">Default</span>
                                <p className="text-body font-normal text-foreground-secondary">02/29</p>
                            </div>
                        </div>
                    </div>

                    <BsThreeDots className='cursor-pointer' />
                </Surface>
                <div className="flex justify-end">
                    <p
                        className="cursor-pointer text-brandDeep flex items-center text-body-sm font-medium"
                        onClick={() => router.push(`/dashboard/settings/billing/add-card`)}
                    >
                        Add new Card <MdOutlineAddCard className="ml-0.5" />
                    </p>
                </div>
            </Section>
      </PageShell>
    )
}

export default Billing