"use client";
import { useFormik } from "formik";
import * as Yup from "yup";
import InputField from "@vibaar/ui/common/InputField";
import Checkbox from "@vibaar/ui/common/Checkbox";
import Button from "@vibaar/ui/common/Button";
import Section from "@vibaar/ui/common/Section";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import IconButton from "@vibaar/ui/common/IconButton";
import { BiArrowBack, BsThreeDotsVertical } from "@vibaar/ui/icons";
import { AiOutlineInfoCircle } from "@vibaar/ui/icons";

const TrackingDetails = () => {
  const formik = useFormik({
    initialValues: {
      trackingId: "",
      shippingProvider: "",
      ridersName: "",
      ridersPhoneNumber: "",
      deliveryTodayConfirmation: false,
    },
    validationSchema: Yup.object({
      trackingId: Yup.string().required("Required"),
      shippingProvider: Yup.string().required("shippingProvider Required"),
      ridersName: Yup.string().required("ridersName Required"),
      ridersPhoneNumber: Yup.string().required("ridersPhoneNumber Required"),
      deliveryTodayConfirmation: Yup.number().when("deliveryToday", {
        is: (deliveryToday: boolean) => deliveryToday === true,
        then: () => Yup.number().required("Required"),
      }),
    }),
    onSubmit: () => {},
  });

  return (
    <PageShell
      header={<Header
                leading={<IconButton icon={BiArrowBack} label="Go back" className="mr-1 -ml-2" />}
                title="Order 00001"
                trailing={<IconButton icon={BsThreeDotsVertical} label="Menu" />}
              />}
      footerAction={<Button onClick={() => {}}>Mark order as shipped</Button>}>
      <Section className="space-y-4">
        <InputField
          name="ShippingProvider"
          placeholder="Shipping provider"
          value={formik.values.shippingProvider}
          onChange={formik.handleChange}
          type="dropdown"
          error={formik.errors.shippingProvider}
        />
        <InputField
          name="trackingId"
          placeholder="Tracking ID"
          value={formik.values.trackingId}
          onChange={formik.handleChange}
          type="text"
          error={formik.errors.trackingId}
        />
        <InputField
          name="ridersName"
          placeholder="Rider’s name"
          value={formik.values.ridersName}
          onChange={formik.handleChange}
          type="text"
          error={formik.errors.ridersName}
        />
        <InputField
          name="ridersPhoneNumber"
          placeholder="Rider’s phone number"
          value={formik.values.ridersPhoneNumber}
          onChange={formik.handleChange}
          type="text"
          error={formik.errors.ridersPhoneNumber}
        />
      </Section>

      <Checkbox
        label="This order will be delivered today."
        onChange={() =>
          formik.setFieldValue(
            "deliveryTodayConfirmation",
            !formik.values.deliveryTodayConfirmation
          )
        }
        checked={formik.values.deliveryTodayConfirmation}
      />

      <div className="flex items-center gap-2">
        <AiOutlineInfoCircle size={20} className="text-foreground-secondary flex-shrink-0" />
        <p className="font-normal text-caption text-foreground-secondary">
          Tracking information helps your buyer to easily track their package and
          enhances customers satisfaction.
        </p>
      </div>
    </PageShell>
  );
};

export default TrackingDetails;
