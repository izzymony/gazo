/* eslint-disable @next/next/no-img-element */
"use client"
import React from 'react'
import { BsThreeDots, MdOutlineAddCard } from "@/design-system/icons";
import { useRouter } from 'next/navigation';
import PageShell from '@/design-system/PageShell'
import Header from '@/design-system/common/Header'
import Card from '@/design-system/common/Card'
import Section from '@/design-system/common/Section'



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
                <Card>
                    <div className='flex justify-between'>
                        <p className='font-medium'>Booster</p>
                        <p className='text-brand text-body-sm'>Change plan</p>
                    </div>

                    <p className="text-ink-40 text-body">₦2,300/month</p>

                    <p className='text-body'> <span className="text-ink-60"> Next billing:</span>  20 Jul 2024</p>
                </Card>
            </Section>

            <Section title="Billing cards">
                <Card className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-3">
                            <img src={'/images/vendor/visa.png'} alt="Visa" className="w-8 h-5 object-contain" />
                            <div>
                                <span className='text-body font-medium text-ink-90'>Mastercard-1243</span>
                                <span className="text-brand ml-2 border border-brand rounded-pill px-2 bg-brand/10 text-caption font-normal">Default</span>
                                <p className="text-body font-normal text-ink-60">02/29</p>
                            </div>
                        </div>
                    </div>

                    <BsThreeDots className='cursor-pointer' />
                </Card>
                <Card className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-3">
                            <img src={'/images/vendor/mastercard.png'} alt="Mastercard" className="w-8 h-5 object-contain" />
                            <div>
                                <span className='text-body font-medium text-ink-90'>Visacard-1243</span>
                                <span className="text-brand ml-2 border border-brand rounded-pill px-2 bg-brand/10 text-caption font-normal">Default</span>
                                <p className="text-body font-normal text-ink-60">02/29</p>
                            </div>
                        </div>
                    </div>

                    <BsThreeDots className='cursor-pointer' />
                </Card>
                <div className="flex justify-end">
                    <p
                        className="cursor-pointer text-brand flex items-center text-body-sm font-medium"
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