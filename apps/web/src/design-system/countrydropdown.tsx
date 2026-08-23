import { useEffect, useState } from "react";
import { Modal } from "@/features/store-setup/StoreAddress";
import { countries } from "@/lib/countries";
import { DropButton } from "@/features/store-setup/StoreDetails";

export default function CountryDropDown({
  setCountry,
}: {
  setCountry: (val: string) => void;
}) {
  const [search, setSearch] = useState<string>("");
  const [datas, setDatas] = useState<
    {
      name: string;
      flag: string;
    }[]
  >(countries);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<{
    name: string;
    flag: string;
  }>({
    name: "Nigeria",
    flag: "ng",
  });

  useEffect(() => {
    if (search) {
      const response = countries.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
      setDatas(response);
    } else {
      setDatas(countries);
    }
  }, [search]);

  return (
    <>
      <DropButton
        toogleDrop={() => setShow(!show)}
        text={selected.name}
        flag={selected.flag}
      />
      <Modal
        isOpen={show}
        buttonAction={() => {
          setCountry(selected.name);
          setShow(!show);
        }}
        selectedCountry={selected}
        setSelectedCountry={setSelected}
        type="country"
        data={datas}
        search={search}
        setSearch={setSearch}
      />
    </>
  );
}
