/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import Image from "next/image";
import { X, Plus, CircleCheck } from "@vibaar/ui/icons";

import H1 from "@vibaar/ui/common/Typography";
import InputField from "@vibaar/ui/common/InputField";
import Switch from "@vibaar/ui/common/Switch";

interface ImageProps {
    base64: string;
    name: string;
    toggle: boolean;
}

interface Step1Props {
    formik: any; // Using any to match the parent component
}

const Step1StartStrong = ({ formik }: Step1Props) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    // Reuse existing image upload logic from ManualProductSetup
    const handleAddImage = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && formik?.values) {
            const currentImages = formik.values.images || [];
            const newImages = Array.from(files).map((file, index) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            base64: reader.result as string,
                            name: `image${currentImages.length + index + 1}`,
                            toggle: true,
                        });
                    };
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(newImages).then((images) => {
                formik.setFieldValue("images", [...currentImages, ...images]);
            });
        }
    };

    const handleImageToggleChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        if (formik?.values?.images) {
            const { checked } = e.target;
            const updatedImages = [...formik.values.images];
            if (updatedImages[index]) {
                updatedImages[index].toggle = checked;
                formik.setFieldValue("images", updatedImages);
            }
        }
    };

    const handleDeleteImage = (index: number) => {
        if (formik?.values?.images) {
            const updatedImages = formik.values.images.filter((_: ImageProps, i: number) => i !== index);
            formik.setFieldValue("images", updatedImages);
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (event: React.DragEvent, index: number) => {
        event.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && formik?.values?.images) {
            const updatedImages = [...formik.values.images];
            const draggedItem = updatedImages[draggedIndex];

            // Remove dragged item
            updatedImages.splice(draggedIndex, 1);

            // Insert at new position
            updatedImages.splice(dragOverIndex, 0, draggedItem);

            formik.setFieldValue("images", updatedImages);
        }

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    return (
        <div className="flex flex-col w-full space-y-6">
                <div>
                    <H1 className="text-h1 text-start">
                        Start Strong
                    </H1>
                    <p className="text-body mt-3 text-ink-40 text-start">
                        You're creating something amazing! ✨
                    </p>
                </div>

                {/* Product Images Section */}
                <div className="w-full">

                    {/* Image Horizontal Scroll Display */}
                    {formik.values?.images && formik.values.images.length > 0 && (
                        <div className="overflow-x-auto mb-4">
                            <div className="flex gap-3 pb-2">
                                {formik.values.images.map((image: ImageProps, index: number) => (
                                    <div
                                        key={`${image.name}-${index}`}
                                        className={`relative flex-shrink-0 w-24 h-24 rounded-card overflow-hidden border cursor-move transition-all duration-200 ${
                                            dragOverIndex === index
                                                ? "border-brand border-dashed"
                                                : draggedIndex === index
                                                ? "border-brand opacity-50"
                                                : "border-ink-10"
                                        }`}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => setSelectedImageIndex(selectedImageIndex === index ? null : index)}
                                    >
                                        {/* Image */}
                                        <Image
                                            src={image?.base64 || ""}
                                            alt={image?.name || `Image ${index + 1}`}
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Delete Button - Only show when image is selected */}
                                        {selectedImageIndex === index && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteImage(index);
                                                    setSelectedImageIndex(null);
                                                }}
                                                className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-card transition-shadow"
                                                aria-label="Delete image"
                                            >
                                                <X className="h-3 w-3 text-ink-60" />
                                            </button>
                                        )}

                                        {/* Toggle Switch (Hidden but maintaining functionality) */}
                                        <div className="absolute bottom-1 right-1 opacity-0">
                                            <Switch
                                                color={"bg-brand"}
                                                checked={formik.values.images[index]?.toggle !== false}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleImageToggleChange(e, index)
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Image Button */}
                    <div className="w-full">
                        <label className="block w-full bg-ink-3 px-4 py-4 font-medium rounded-card text-body text-brand border-2 border-dashed border-ink-10 hover:border-brand transition-colors cursor-pointer group">
                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleAddImage}
                                />
                                <Plus className="h-5 w-5 text-brand group-hover:scale-110 transition-transform" />
                                <span>Add image</span>
                            </div>
                        </label>
                    </div>

                    {/* Image Counter */}
                    {formik.values?.images && formik.values.images.length > 0 && (
                        <div className="mt-2 text-body-sm text-ink-60 text-center">
                            {formik.values.images.length} image{formik.values.images.length !== 1 ? 's' : ''} added
                            <span className="ml-2 text-caption text-ink-40">
                                • Drag to reorder
                            </span>
                        </div>
                    )}

                    {formik.errors.images && (
                        <small className="text-red block mt-2">
                            {formik.errors.images as string}
                        </small>
                    )}
                </div>

                {/* Product Title */}
                <div className="w-full">
                    <InputField
                        type="text"
                        name="title"
                        placeholder="Product Title"
                        value={formik.values?.title || ""}
                        onChange={formik.handleChange}
                        error={formik.errors.title as string}
                    />
                </div>

                {/* Price Fields */}
                <div className="w-full space-y-3">
                    <div className="flex w-full gap-3">
                        <div className="flex-1 min-w-0">
                            <InputField
                                type="number"
                                name="price"
                                placeholder="Price"
                                value={formik.values?.price || ""}
                                onChange={formik.handleChange}
                                showNairaSymbol={true}
                                inputMode="numeric"
                                error={formik.errors.price as string}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <InputField
                                type="number"
                                name="oldPrice"
                                placeholder="Old price (optional)"
                                value={formik.values?.oldPrice || ""}
                                onChange={formik.handleChange}
                                showNairaSymbol={true}
                                inputMode="numeric"
                                error={formik.errors.oldPrice as string}
                            />
                        </div>
                    </div>

                    {/* Discount Indicator */}
                    {formik.values?.price && formik.values?.oldPrice &&
                     Number(formik.values.oldPrice) > Number(formik.values.price) && (
                        <div className="bg-green-50 border border-green-200 rounded-card p-3">
                            <div className="flex items-center gap-2">
                                <CircleCheck size={16} className="text-green-600" />
                                <span className="text-body-sm font-medium text-green-700">
                                    {Math.round(((Number(formik.values.oldPrice) - Number(formik.values.price)) / Number(formik.values.oldPrice)) * 100)}% discount
                                </span>
                            </div>
                            <p className="text-caption text-green-600 mt-1">
                                Customers love discounts! This will help your product stand out.
                            </p>
                        </div>
                    )}
                </div>
        </div>
    );
};

export default Step1StartStrong;