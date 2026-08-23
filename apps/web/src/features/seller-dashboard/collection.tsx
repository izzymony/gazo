"use client";

import React, { useState, useEffect } from "react";
import DataSort from "./datasort";
import { IoCubeOutline } from "@vibaar/ui/icons";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Section from "@vibaar/ui/common/Section";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { formatCurrency } from "@/lib/utils";

interface CollectionData {
    name: string;
    productCount: number;
    totalValue: number;
    averagePrice: number;
}

const CollectionCard = ({ collection }: { collection: CollectionData }) => {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                    <span className="text-body font-medium text-ink-90">{collection.name}</span>
                    <span className="text-body-sm space-x-1 flex items-center rounded-field bg-ink-3">
                        <span>{collection.productCount}</span>
                        <IoCubeOutline size={16} />
                    </span>
                </div>
                <div>
                    <p className="text-body font-medium text-ink-90">
                        {formatCurrency(collection.totalValue)}
                    </p>
                </div>
            </div>
            <div className="flex justify-between">
                <p className="text-body-sm text-ink-40">Avg Price: {formatCurrency(collection.averagePrice)}</p>
                <span className="text-body-sm text-ink-40">Total Value</span>
            </div>
        </div>
    );
};

const Collections = () => {
    const { businessProduct } = useBusinessStore();
    const [collections, setCollections] = useState<CollectionData[]>([]);
    const [sortOrder, setSortOrder] = useState<"ascending" | "descending">("ascending");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Aggregate products by tags
        const tagMap = new Map<string, { products: any[], totalValue: number }>();

        businessProduct.forEach(product => {
            if (product.tag && Array.isArray(product.tag)) {
                product.tag.forEach((tag: string) => {
                    if (!tagMap.has(tag)) {
                        tagMap.set(tag, { products: [], totalValue: 0 });
                    }
                    const tagData = tagMap.get(tag)!;
                    tagData.products.push(product);
                    tagData.totalValue += product.price || 0;
                });
            }
        });

        // Convert to collection data format
        const collectionsData: CollectionData[] = Array.from(tagMap.entries()).map(([name, data]) => ({
            name,
            productCount: data.products.length,
            totalValue: data.totalValue,
            averagePrice: data.products.length > 0 ? data.totalValue / data.products.length : 0
        }));

        setCollections(collectionsData);
    }, [businessProduct]);

    const handleSortToggle = () => {
        setSortOrder((prevOrder) => (prevOrder === "ascending" ? "descending" : "ascending"));
    };

    const handleSortChange = (option: "ascending" | "descending") => {
        setSortOrder(option);
    };

    // Filter and sort the collections
    const filteredCollections = collections
        .filter((collection) =>
            collection.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            return sortOrder === "ascending"
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        });

    return (
        <div className="space-y-6">
            <DataSort
                sortOrder={sortOrder}
                onSortToggle={handleSortToggle}
                onSortOrderChange={handleSortChange}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <Section>
                {collections.length === 0 ? (
                    <EmptyState
                        image="/images/emptystate/collections_empty_state.svg"
                        title="No product collections yet."
                        subtitle="Start by adding tags to your products and they will appear here."
                    />
                ) : (
                    filteredCollections.map((collection, index) => (
                        <CollectionCard key={index} collection={collection} />
                    ))
                )}
            </Section>
        </div>
    );
};

export default Collections;
