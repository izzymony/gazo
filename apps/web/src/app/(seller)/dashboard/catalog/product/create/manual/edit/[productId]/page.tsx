import EditProductSetup from "@/features/product-setup/edit/EditProductSetup";

interface EditProductPageProps {
    params: {
        productId: string;
    };
}

const EditProductPage = ({ params }: EditProductPageProps) => {
    return <EditProductSetup productId={params.productId} />;
};

export default EditProductPage;