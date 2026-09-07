"use client";
import React, { useEffect, useState } from 'react';
import InputField from '@vibaar/ui/common/InputField';
import { useFormik } from "formik";
import * as Yup from "yup";
import PageShell from '@vibaar/ui/PageShell';
import Header from "@vibaar/ui/common/Header";
import Button from '@vibaar/ui/common/Button';
import Section from '@vibaar/ui/common/Section';
import { Check } from '@vibaar/ui/icons';
import { useRouter } from 'next/navigation';
import useBusinessStore from '@/store/businessStore';
import LocationModal from '@/hooks/locationmodal';

const Page = () => {
    const router = useRouter()
    const {  store, updateStore, getAuthenticatedUserStore, isLoading} = useBusinessStore()

    // Location modal state
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [location, setLocation] = useState<any>({});

    const formik = useFormik({
        initialValues: {
            countryRegion: "",
            state: "",
            searchAddress: "",
        },
        validationSchema: Yup.object({
            countryRegion: Yup.string().required("Country Required"),
            state: Yup.string().required("State Required"),
            searchAddress: Yup.string().required("Required"),
        }),
        onSubmit: (values) => {
            // Backend requires full business object with required fields
            const payload = {
                name: store?.name,
                tag: store?.tag,
                phone: store?.phone,
                email: store?.email,
                category: store?.category,
                address: {
                    country: "Nigeria", // Always Nigeria for now
                    province: values.state,
                    address_line: values.searchAddress,
                },
              };

              updateStore(store?.id, payload, () => {
                router.back();
              });
                   },
    });

    // Load existing address data when component mounts or store data changes
    useEffect(() => {
        if (store?.address) {
            formik.setValues({
                countryRegion: store.address.country || "",
                state: store.address.province || "",
                searchAddress: store.address.address_line || "",
            });
        }
    }, [store?.address]);

    // Load fresh store data on mount
    useEffect(() => {
        getAuthenticatedUserStore();
    }, [getAuthenticatedUserStore]);

    return (
        <PageShell
          header={
            <Header
              onBack={() => router.back()}
              title="Store Address"
            />
          }
          footerAction={
            <Button type="submit" onClick={() => formik.handleSubmit()} loading={isLoading}>
              Save
            </Button>
          }
        >

            {/* Form fields */}
            <form onSubmit={formik.handleSubmit} className="flex flex-col flex-grow">
                <Section className="flex-grow space-y-4">
                    <div className="relative">
                        <InputField
                            name="countryRegion"
                            placeholder="Country/Region"
                            type="text"
                            value="Nigeria"
                            isReadonly={true}
                            className="bg-surface-muted"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-6 h-6 rounded-full bg-success-foreground flex items-center justify-center">
                                <Check size={16} className="text-white" />
                            </div>
                        </div>
                    </div>
                    <InputField
                        name="state"
                        placeholder="State (auto-filled from address)"
                        type="text"
                        value={formik.values.state}
                        onChange={formik.handleChange}
                        error={formik.errors.state}
                    />
                    <div onClick={() => setIsLocationModalOpen(true)} className="cursor-pointer">
                        <InputField
                            name="searchAddress"
                            placeholder="Tap to search address"
                            type="text"
                            value={formik.values.searchAddress}
                            onChange={formik.handleChange}
                            error={formik.errors.searchAddress}
                            isReadonly={true}
                            className="cursor-pointer"
                        />
                    </div>
                </Section>
            </form>

            {/* LocationModal for address search */}
            <LocationModal
                isLocationModalOpen={isLocationModalOpen}
                closeLocationModal={() => setIsLocationModalOpen(false)}
                setLoading={() => {}}
                setLocation={setLocation}
                location={location}
                setAddress={(address: string) => {
                    formik.setFieldValue('searchAddress', address);

                    // Try to extract state from address
                    const addressParts = address.split(',').map(part => part.trim());
                    if (addressParts.length > 1) {
                        // Second-to-last part is usually the state
                        const possibleState = addressParts[addressParts.length - 2];
                        if (possibleState) {
                            formik.setFieldValue('state', possibleState);
                        }
                    }

                    // Set country to Nigeria if not already set
                    if (!formik.values.countryRegion) {
                        formik.setFieldValue('countryRegion', 'Nigeria');
                    }
                }}
            />
        </PageShell>
    );
};

export default Page;
