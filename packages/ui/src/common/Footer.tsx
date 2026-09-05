import Link from "next/link";

const Footer = () => {
  return (
    <div className=" max-w-[320px] text-center mx-auto w-full px-5 pb-2.5 ">
      <p className="text-foreground-muted text-caption font-normal ">
        By continuing, I agree to Vibaar&apos;s {" "}
        <Link href={"/terms"} className="text-brandDeep">
          Terms of service
        </Link>{" "}
        <br />
        and{" "}
        <Link href={"/privacy"} className="text-brandDeep">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
};

export default Footer;
